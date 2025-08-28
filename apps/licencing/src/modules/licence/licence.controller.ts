import { Controller, Get, Post, Query, ParseIntPipe, ParseEnumPipe, Body } from '@nestjs/common';
import { LicenceService } from './licence.service';
import { LicenceRequirementService } from './licence-requirement.service';
import { LicenceRequirementsResponseDto } from './dtos/licence-requirements-response.dto';
import { UpdateAbnConditionsDto } from './dtos/update-abn-conditions.dto';
import { AbnConditionKind } from '../setup/licencing/entity/category-state-abn-condition.entity';

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

  @Post('g')
  async updateAbnConditions(
    @Body() updateDto: UpdateAbnConditionsDto,
  ): Promise<{ message: string; updated: boolean }> {
    return this.licenceRequirementService.updateAbnConditions(updateDto.fileContent);
  }
}


