import { Controller, Get, Post, Query, ParseIntPipe, Body, BadRequestException, NotFoundException } from '@nestjs/common';
import { LicenceRequirementService } from './application/services/licence-requirement.service';
import { LicenceRequirementsResponseDto } from './dtos/licence-requirements-response.dto';
import { UpdateLicenceRequirementsDto } from './dtos/update-licence-requirements.dto';
import { AbnConditionKind } from './domain/entities/abn-condition.entity';
import { CategoryRequestValidator } from './validation/category-request.validator';
import { UpdateLicenceRequirementsValidator } from './validation/update-requirements.validator';
import { ErrorHandler } from './utils/error-handler.util';

@Controller('licences')
export class LicenceController {
  constructor(
    private readonly licenceRequirementService: LicenceRequirementService,
  ) {}

  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }

  @Get('requirements')
  async getLicenceRequirements(
    @Query('parent_category_id', ParseIntPipe) parentCategoryId: number,
    @Query('abn_kind') abnKind: string,
    @Query('sub_category_id') subCategoryId?: string,
    @Query('state') state?: string,
  ): Promise<LicenceRequirementsResponseDto> {
    // Use shared validation logic
    const validated = CategoryRequestValidator.validateAndParseCategoryRequest({
      parent_category_id: parentCategoryId,
      sub_category_id: subCategoryId,
      abn_kind: abnKind,
      state
    }, 'Single request');

    return this.licenceRequirementService.getLicenceRequirementsWithAbn(
      validated.parent_category_id,
      validated.sub_category_id,
      validated.abn_kind,
      validated.state
    );
  }

  @Get('requirements-batch')
  async getLicenceRequirementsMultiple(
    @Query('filter') filter: string,
  ): Promise<{ 
    data: LicenceRequirementsResponseDto; 
    found: number; 
    notFound: Array<{ 
      parent_category_id: number; 
      sub_category_id?: number; 
      abn_kind: string; 
      reason: string 
    }> 
  }> {
    try {
      // Step 1: Validate and parse batch filter (shared logic)
      const rawCategories = CategoryRequestValidator.validateBatchFilter(filter);

      // Step 2: Validate each category request (shared logic)
      const validatedCategories = rawCategories.map((category, index) => {
        return CategoryRequestValidator.validateAndParseCategoryRequest(
          category, 
          `Category ${index + 1}`
        );
      });

      // Step 3: Call service with validated data
      return this.licenceRequirementService.getLicenceRequirementsMultiple(validatedCategories);

    } catch (error) {
      // Use centralized error handling
      ErrorHandler.handleFilterError(error);
    }
  }



  @Post('update-licence-requirements')
  async updateLicenceRequirements(
    @Body() updateDto: any, // DTO validation disabled: class-validator doesn't support Record<string, Type> properly
  ): Promise<{ 
    message: string; 
    updated: boolean; 
    processed: number; 
    missing: Array<{ 
      name: string; 
      sub_category_name?: string; 
      reason: string; 
      type: 'parent' | 'sub' 
    }> 
  }> {
    try {
      // Use centralized validation (eliminates ~50 lines of duplicate validation code)
      UpdateLicenceRequirementsValidator.validate(updateDto);
      
      return this.licenceRequirementService.updateLicenceRequirements(updateDto);
    } catch (error) {
      // Use centralized error handling
      ErrorHandler.handleValidationError(error, 'Update');
    }
  }
}


