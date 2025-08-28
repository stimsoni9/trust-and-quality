import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthorityEntity } from './entity/authority.entity';
import { readFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class AuthorityLoader {
  private readonly logger = new Logger(AuthorityLoader.name);

  constructor(
    @InjectRepository(AuthorityEntity)
    private readonly authorityRepo: Repository<AuthorityEntity>,
  ) {}

  async loadAndSaveIfEmpty(): Promise<void> {
    const count = await this.authorityRepo.count();
    if (count > 0) {
      this.logger.log('Authorities seed skipped: data already present');
      return;
    }

    this.logger.log('Seeding authorities from JSON...');

    // The compiled file will live under dist/apps/licencing/src/modules/setup/licencing
    // so we resolve the JSON path relative to this file's directory at runtime.
    const jsonPath = join(__dirname, 'licensing_authorities.json');
    const raw = readFileSync(jsonPath, 'utf8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      this.logger.warn('Authorities JSON did not contain a top-level array; skipping');
      return;
    }

    const records: AuthorityEntity[] = [];
    for (const item of parsed) {
      const authority = String(item?.authority ?? '').trim();
      const state = String(item?.state ?? '').trim();
      const linkVal = item?.link == null ? null : String(item.link).trim();
      if (!authority || !state) continue;
      records.push({ 
        authority, 
        authorityName: authority, // Set authorityName to the same value as authority
        state, 
        link: linkVal 
      } as AuthorityEntity);
    }

    if (records.length === 0) {
      this.logger.warn('No valid authority records found in JSON; skipping');
      return;
    }

    await this.authorityRepo.save(records, { chunk: 200 });
    this.logger.log(`Seeded ${records.length} authorities.`);
  }
}



