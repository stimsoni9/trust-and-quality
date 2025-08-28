import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LicenceEntity } from '../setup/licencing/entity/licence.entity';

@Injectable()
export class LicenceService {
  constructor(
    @InjectRepository(LicenceEntity)
    private readonly licenceRepository: Repository<LicenceEntity>,
  ) {}

  async findAll(): Promise<LicenceEntity[]> {
    return this.licenceRepository.find({ take: 10 });
  }
}


