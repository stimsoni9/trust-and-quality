import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

export type DatabaseModuleOptions = Partial<PostgresConnectionOptions> & {
  connectTimeoutMS?: number;
};

