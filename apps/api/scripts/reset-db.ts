import 'dotenv/config';
import { execSync } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { Client } from 'pg';

type CliOptions = {
  withSeed: boolean;
  migrationFile: string;
};

const DEFAULT_BASELINE_FILE = 'prisma/migrations/20260221220000_init_v7_baseline/migration.sql';

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL ou DIRECT_URL nao configurados.');
  }

  const migrationFile = path.resolve(process.cwd(), options.migrationFile);
  await access(migrationFile);
  const migrationSql = await readFile(migrationFile, 'utf8');

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 15_000,
  });

  try {
    console.log(`[reset-db] usando migration: ${options.migrationFile}`);
    console.log('[reset-db] conectando no banco...');
    await client.connect();

    console.log('[reset-db] recriando schema public...');
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');

    console.log('[reset-db] aplicando baseline...');
    await client.query(migrationSql);

    console.log('[reset-db] estrutura recriada com sucesso.');
  } finally {
    await client.end();
  }

  if (options.withSeed) {
    console.log('[reset-db] executando seed...');
    execSync('npm run seed', { stdio: 'inherit' });
  } else {
    console.log('[reset-db] seed ignorado (flag --no-seed).');
  }
}

function parseCliOptions(args: string[]): CliOptions {
  let withSeed = true;
  let migrationFile = DEFAULT_BASELINE_FILE;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--no-seed') {
      withSeed = false;
      continue;
    }

    if (arg === '--migration-file') {
      const value = args[index + 1];
      if (!value) {
        throw new Error('Informe o caminho apos --migration-file.');
      }
      migrationFile = value;
      index += 1;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      printHelpAndExit();
    }

    throw new Error(`Flag nao suportada: ${arg}`);
  }

  return {
    withSeed,
    migrationFile,
  };
}

function printHelpAndExit() {
  console.log('Uso: npm run db:reset -- [--no-seed] [--migration-file <caminho>]');
  process.exit(0);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[reset-db] erro: ${message}`);
  process.exitCode = 1;
});
