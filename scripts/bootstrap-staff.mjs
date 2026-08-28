import { randomBytes, randomUUID, scrypt as nodeScrypt } from "node:crypto";

import pg from "pg";

const staff = [
  { username: "turner", displayName: "Turner", role: "owner" },
  { username: "arthur", displayName: "Arthur", role: "manager" },
  { username: "tuan", displayName: "Tuan", role: "technician" },
  { username: "brennan", displayName: "Brennan", role: "technician" },
  { username: "ryan", displayName: "Ryan", role: "technician" },
  { username: "jared", displayName: "Jared", role: "technician" },
  { username: "chase", displayName: "Chase", role: "technician" },
];

function scrypt(password, salt) {
  return new Promise((resolve, reject) => {
    nodeScrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt);
  return ["scrypt", 32768, 8, 1, salt.toString("base64url"), key.toString("base64url")].join("$");
}

function temporaryPassword() {
  return `${randomBytes(9).toString("base64url")}!7a`;
}

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
const created = [];

try {
  await client.query("begin");
  const shopResult = await client.query(
    `insert into app.shops (id, name, slug, job_number_prefix, status)
     values ($1, 'Auto Bros Garage', 'auto-bros-garage', 'AB', 'active')
     on conflict (slug) do update set name = excluded.name
     returning id`,
    [randomUUID()],
  );
  const shopId = shopResult.rows[0].id;

  for (const account of staff) {
    const existingUser = await client.query(
      `select id, role from app.users
       where shop_id = $1 and lower(display_name) = lower($2)
       limit 1`,
      [shopId, account.displayName],
    );
    let userId;
    if (existingUser.rowCount) {
      userId = existingUser.rows[0].id;
      if (existingUser.rows[0].role !== account.role) {
        throw new Error(
          `${account.displayName} already exists with a different role; review manually`,
        );
      }
    } else {
      userId = randomUUID();
      await client.query(
        `insert into app.users (id, shop_id, role, display_name, active)
         values ($1, $2, $3, $4, true)`,
        [userId, shopId, account.role, account.displayName],
      );
    }

    const existingCredential = await client.query(
      "select 1 from app.user_credentials where user_id = $1",
      [userId],
    );
    if (existingCredential.rowCount) continue;

    const password = temporaryPassword();
    await client.query(
      `insert into app.user_credentials
       (user_id, shop_id, username, password_hash, failed_attempts)
       values ($1, $2, $3, $4, 0)`,
      [userId, shopId, account.username, await hashPassword(password)],
    );
    created.push({ ...account, password });
  }

  await client.query("commit");
  if (created.length === 0) {
    console.log("All staff credentials already exist; no passwords were changed.");
  } else {
    console.log("Temporary staff credentials (shown once):");
    for (const account of created) {
      console.log(`${account.displayName}: ${account.username} / ${account.password}`);
    }
  }
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}
