import { DynamicModule, Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { merge } from 'lodash';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { ConfigModule } from '@nestjs/config';
import databaseConfig from './database.config';
import { DatabaseModuleOptions } from './database-module-options.interface';

const isPostgresOptions = (m: any): m is PostgresConnectionOptions => {
  return m?.driver === 'postgres';
};

@Module({
  imports: [ConfigModule.forFeature(databaseConfig)],
})
export class DatabaseModule {
  public static forDatabase(
    opts?: DatabaseModuleOptions,
    name?: string,
  ): DynamicModule {
    const logger = new Logger(DatabaseModule.name);

    const typeOrm = TypeOrmModule.forRootAsync({
      name,
      imports: [ConfigModule.forFeature(databaseConfig)],
      inject: [databaseConfig.KEY],
      useFactory: (config: DatabaseModuleOptions) => {
        const merged = merge({}, config, opts);

        if ((merged as any).synchronize) {
          logger.warn(
            `TypeORM synchronisation enabled for ${name || 'default'} database!`,
          );
        }

        if (isPostgresOptions(merged) && !(merged as any).poolErrorHandler) {
          (merged as any).poolErrorHandler = (err: any) => logger.error(err);
        }

        return merged;
      },
    });

    return {
      module: DatabaseModule,
      imports: [typeOrm],
      exports: [typeOrm],
    };
  }
}


