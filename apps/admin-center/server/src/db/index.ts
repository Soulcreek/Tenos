import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as accountSchemas from './schemas/accounts.js';
import * as characterSchemas from './schemas/characters.js';
import * as serverSchemas from './schemas/servers.js';
import * as adminSchemas from './schemas/admin.js';

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://tenos:tenos_dev@localhost:5432/tenos';

const client = postgres(connectionString, {
  max: 20,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, {
  schema: {
    ...accountSchemas,
    ...characterSchemas,
    ...serverSchemas,
    ...adminSchemas,
  },
});

export type Database = typeof db;

export {
  accountSchemas,
  characterSchemas,
  serverSchemas,
  adminSchemas,
};
