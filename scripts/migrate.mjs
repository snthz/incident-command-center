import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const MIGRATIONS_DIR = "supabase/migrations";
const SEED_FILE = "supabase/seed.sql";
const LOCK_KEY = 727272;

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query("select pg_advisory_lock($1)", [LOCK_KEY]);

  await client.query(
    `create table if not exists public._app_migrations (
       name text primary key,
       applied_at timestamptz not null default now()
     )`,
  );

  const files = (await readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const appliedRows = await client.query("select name from public._app_migrations");
  const applied = new Set(appliedRows.rows.map((row) => row.name));

  const schemaExists = (
    await client.query("select to_regclass('public.incidents') as reg")
  ).rows[0].reg;

  if (schemaExists && applied.size === 0) {
    for (const file of files) {
      await client.query(
        "insert into public._app_migrations (name) values ($1) on conflict do nothing",
        [file],
      );
    }
    console.log(`migrate: baselined ${files.length} existing migrations`);
  } else {
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query(
          "insert into public._app_migrations (name) values ($1)",
          [file],
        );
        await client.query("commit");
        console.log(`migrate: applied ${file}`);
      } catch (error) {
        await client.query("rollback");
        throw new Error(`migration ${file} failed: ${error.message}`);
      }
    }
  }

  if (process.env.SEED_ON_EMPTY !== "0") {
    const count = (
      await client.query("select count(*)::int as count from public.incidents")
    ).rows[0].count;
    if (count === 0) {
      try {
        const seed = await readFile(SEED_FILE, "utf8");
        await client.query(seed);
        console.log("migrate: seeded empty database");
      } catch (error) {
        console.warn(`migrate: seed skipped (${error.message})`);
      }
    }
  }
} finally {
  await client.query("select pg_advisory_unlock($1)", [LOCK_KEY]);
  await client.end();
}

console.log("migrate: done");
