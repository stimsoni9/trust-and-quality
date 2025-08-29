import { Controller, Get, Post, Query, ParseIntPipe, ParseEnumPipe, Body, BadRequestException, NotFoundException } from '@nestjs/common';
import { LicenceService } from './licence.service';
import { LicenceRequirementService } from './licence-requirement.service';
import { LicenceRequirementsResponseDto } from './dtos/licence-requirements-response.dto';
import { UpdateLicenceRequirementsDto } from './dtos/update-licence-requirements.dto';
import { LicenceRequirementsRequestDto } from './dtos/licence-requirements-request.dto';
import { AbnConditionKind } from './entities/category-state-abn-condition.entity';

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
    @Query('abn_kind', new ParseEnumPipe(AbnConditionKind)) abnConditionKind: AbnConditionKind,
    @Query('sub_category_id') subCategoryId?: string,
  ): Promise<LicenceRequirementsResponseDto> {
    const subCategoryIdNum = subCategoryId ? parseInt(subCategoryId, 10) : 0;
    return this.licenceRequirementService.getLicenceRequirementsWithAbn(parentCategoryId, subCategoryIdNum, abnConditionKind);
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
      abn_kind: AbnConditionKind; 
      reason: string 
    }> 
  }> {
    try {
      // Validate that filter parameter exists
      if (!filter) {
        throw new BadRequestException('Missing required query parameter: filter');
      }

      // Parse JSON and validate structure
      let categories: any[];
      try {
        categories = JSON.parse(filter);
      } catch (parseError) {
        throw new BadRequestException('Invalid filter parameter. Expected valid JSON array.');
      }

      // Validate that it's an array
      if (!Array.isArray(categories)) {
        throw new BadRequestException('Filter parameter must be a JSON array.');
      }

      // Validate each category object
      for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        const index = i + 1;
        
        if (!category || typeof category !== 'object') {
          throw new BadRequestException(`Category ${index}: Must be a valid object`);
        }
        
        if (typeof category.parent_category_id !== 'number') {
          throw new BadRequestException(`Category ${index}: parent_category_id must be a number, got ${typeof category.parent_category_id}`);
        }
        
        if (category.sub_category_id !== undefined && typeof category.sub_category_id !== 'number') {
          throw new BadRequestException(`Category ${index}: sub_category_id must be a number, got ${typeof category.sub_category_id}`);
        }
        
        if (!category.abn_kind) {
          throw new BadRequestException(`Category ${index}: abn_kind is required`);
        }
        
        // Validate ABN kind enum values
        const validAbnKinds = ['company', 'individual', 'partnership', 'trust', 'other'];
        if (!validAbnKinds.includes(category.abn_kind)) {
          throw new BadRequestException(`Category ${index}: abn_kind must be one of: ${validAbnKinds.join(', ')}. Got: ${category.abn_kind}`);
        }
      }

      return this.licenceRequirementService.getLicenceRequirementsMultiple(categories);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new BadRequestException(`Filter validation failed: ${errorMessage}`);
    }
  }

  @Get('test-multiple')
  async testMultiple(): Promise<{ message: string }> {
    return { message: 'Multiple requirements endpoint is working!' };
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


