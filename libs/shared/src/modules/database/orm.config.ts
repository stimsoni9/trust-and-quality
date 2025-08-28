import { join } from 'path';
import { ConnectionOptions } from 'typeorm';

const ssl = process.env.MARKETPLACE_DB_SSL
  ? {
      rejectUnauthorized: false,
    }
  : undefined;

const [host, port] = `${process.env.MARKETPLACE_DB_HOST || 'localhost'}`.split(
  ':',
);

export default {
  host,
  port: +(process.env.MARKETPLACE_DB_PORT || port || 5432),
  type: 'postgres',
  autoLoadEntities: true,
  synchronize: false,
  username: process.env.MARKETPLACE_DB_USER || 'postgres',
  password: process.env.MARKETPLACE_DB_PASS || 'marketplace',
  database: process.env.MARKETPLACE_DB_NAME || 'marketplace',
  connectTimeoutMS: 2000,
  ssl,
  extra: {
    max: +(process.env.MARKETPLACE_DB_CONN_MAX || 5),
    idleTimeoutMillis: 1000,
    maxUses: 7500,
    connectionTimeoutMillis: 1000,
    ssl,
  },
  migrations: [join(__dirname, 'migrations/*.{ts,js}')],
  cli: {
    migrationsDir: join(__dirname, 'migrations'),
  },
} as ConnectionOptions;


