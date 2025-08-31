import { Controller, Get, Post, Query, ParseIntPipe, Body, BadRequestException, NotFoundException } from '@nestjs/common';
import { LicenceService } from './licence.service';
import { LicenceRequirementService } from './application/services/licence-requirement.service';
import { LicenceRequirementsResponseDto } from './dtos/licence-requirements-response.dto';
import { UpdateLicenceRequirementsDto } from './dtos/update-licence-requirements.dto';
import { AbnConditionKind } from './domain/entities/abn-condition.entity';
import { CategoryRequestValidator } from './validation/category-request.validator';

@Controller('licences')
export class LicenceController {
  constructor(
    private readonly licenceService: LicenceService,
    private readonly licenceRequirementService: LicenceRequirementService,
  ) {}

  @Get()
  async list() {
    return this.licenceService.findAll();
  }

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
      // Consistent error handling
      if (error instanceof BadRequestException) {
        throw error; // Re-throw validation errors as-is
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new BadRequestException(`Filter validation failed: ${errorMessage}`);
    }
  }



  @Post('update-licence-requirements')
  async updateLicenceRequirements(
    @Body() updateDto: UpdateLicenceRequirementsDto,
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
      // Validate that request body exists
      if (!updateDto) {
        throw new BadRequestException('Request body is required for this endpoint');
      }

      // Validate that categories array exists
      if (!updateDto.categories || !Array.isArray(updateDto.categories)) {
        throw new BadRequestException('Request body must contain a categories array');
      }

      // Validate each category object
      for (let i = 0; i < updateDto.categories.length; i++) {
        const category = updateDto.categories[i];
        const index = i + 1;
        
        if (!category || typeof category !== 'object') {
          throw new BadRequestException(`Category ${index}: Must be a valid object`);
        }
        
        if (!category.name || typeof category.name !== 'string') {
          throw new BadRequestException(`Category ${index}: name is required and must be a string`);
        }
        
        if (typeof category.is_parent !== 'boolean') {
          throw new BadRequestException(`Category ${index}: is_parent must be a boolean, got ${typeof category.is_parent}`);
        }
        
        if (!category.states || typeof category.states !== 'object') {
          throw new BadRequestException(`Category ${index}: states object is required`);
        }
        
        // Validate states object
        for (const [stateKey, stateData] of Object.entries(category.states)) {
          if (!stateData || typeof stateData !== 'object') {
            throw new BadRequestException(`Category ${index}, state ${stateKey}: Must be a valid object`);
          }
          
          if (typeof stateData.licence_required !== 'boolean') {
            throw new BadRequestException(`Category ${index}, state ${stateKey}: licence_required must be a boolean`);
          }
          
          if (!stateData.abn_conditions || typeof stateData.abn_conditions !== 'object') {
            throw new BadRequestException(`Category ${index}, state ${stateKey}: abn_conditions object is required`);
          }
          
          if (!Array.isArray(stateData.groups)) {
            throw new BadRequestException(`Category ${index}, state ${stateKey}: groups must be an array`);
          }
        }
      }

      return this.licenceRequirementService.updateLicenceRequirements(updateDto);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error; // Re-throw BadRequestException as-is
      }
      if (error instanceof Error) {
        throw new BadRequestException(`Update validation failed: ${error.message}`);
      }
      throw new BadRequestException('Update validation failed: Unknown error occurred');
    }
  }
}


