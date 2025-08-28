import { registerAs } from '@nestjs/config';
import { DatabaseModuleOptions } from './database-module-options.interface';
import { DATABASE_CONFIG } from './database.constants';
import ormConfig from './orm.config';

export const factory = registerAs(
  DATABASE_CONFIG,
  (): DatabaseModuleOptions => {
    return {
      ...ormConfig,
    } as DatabaseModuleOptions;
  },
);

export default factory;


