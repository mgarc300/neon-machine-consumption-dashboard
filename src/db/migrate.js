import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { queryDirect, closePool } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Runs the database migration to create all necessary tables and indexes.
 */
export async function runMigration() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  console.log(`📖 Reading schema file from: ${schemaPath}`);
  
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  console.log('🚀 Applying schema migrations to Neon Postgres (via direct unpooled connection)...');
  try {
    await queryDirect(sql);
    console.log('✅ Migration applied successfully! Tables `machines` and `consumption_readings` are ready.');
    return { success: true };
  } catch (err) {
    if (err.message.includes('Missing DATABASE_URL')) {
      console.warn('\n⚠️  Migration warning:');
      console.warn(err.message);
      console.warn('Set DATABASE_URL / DATABASE_URL_UNPOOLED in .env.local with your Neon connection string.\n');
      return { success: false, reason: 'missing_credentials' };
    }
    console.error('❌ Migration failed:', err.message);
    throw err;
  }
}

// Execute directly if run as CLI script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigration()
    .then(async (result) => {
      await closePool();
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(0);
      }
    })
    .catch(async (err) => {
      await closePool();
      console.error(err);
      process.exit(1);
    });
}
