/**
 * Upsert the three temporary board-review logins without wiping dummy data.
 * Run from backend/:  node db/ensure-board-reviewers.js
 *
 * Password for new accounts: Neighborhood1
 */
require("dotenv").config();
const bcrypt = require("bcrypt");
const db = require("./index");

const DEMO_PASSWORD = "Neighborhood1";

const REVIEWERS = [
  {
    first: "Danelle",
    last: "Delp",
    email: "danelle.delp@example.com",
    street: "1101 Town Central Cir",
    token: "DEL1",
  },
  {
    first: "Christopher",
    last: "Cunningham",
    email: "chris.cunningham@example.com",
    street: "1108 Town Central Cir",
    token: "CUN1",
  },
  {
    first: "Cole",
    last: "Schaffitzel",
    email: "cole.schaffitzel@example.com",
    street: "1114 Town Central Cir",
    token: "SCH1",
  },
];

async function ensureLot(street, first, last, email, token) {
  const existing = await db.query(
    `SELECT id FROM neighborhood_roster WHERE lower(trim(street_address)) = lower(trim($1))`,
    [street],
  );
  if (existing.rows[0]) {
    await db.query(
      `UPDATE neighborhood_roster
          SET first_name = $1, last_name = $2, email = $3, is_claimed = true
        WHERE id = $4`,
      [first, last, email, existing.rows[0].id],
    );
    return existing.rows[0].id;
  }

  const inserted = await db.query(
    `INSERT INTO neighborhood_roster
      (street_address, first_name, last_name, email, is_claimed, onboarding_token)
     VALUES ($1, $2, $3, $4, true, $5)
     RETURNING id`,
    [street, first, last, email, token],
  );
  return inserted.rows[0].id;
}

async function ensureUser({ first, last, email, street, lotId, passwordHash }) {
  const found = await db.query(
    `SELECT id FROM users
      WHERE lower(email) = lower($1)
         OR (
           lower(first_name) = lower($2)
           AND lower(last_name) = lower($3)
           AND lower(email) LIKE '%@towncentralhoa.org'
         )`,
    [email, first, last],
  );
  if (found.rows[0]) {
    await db.query(
      `UPDATE users
          SET first_name = $1,
              last_name = $2,
              email = $3,
              address = $4,
              role = 'board_member',
              agreed_to_guidelines = true,
              roster_lot_id = $5
        WHERE id = $6`,
      [first, last, email, street, lotId, found.rows[0].id],
    );
    return { id: found.rows[0].id, created: false };
  }

  const inserted = await db.query(
    `INSERT INTO users
      (first_name, last_name, email, address, role, password_hash, agreed_to_guidelines, roster_lot_id)
     VALUES ($1, $2, $3, $4, 'board_member', $5, true, $6)
     RETURNING id`,
    [first, last, email, street, passwordHash, lotId],
  );
  return { id: inserted.rows[0].id, created: true };
}

async function run() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  for (const person of REVIEWERS) {
    const lotId = await ensureLot(person.street, person.first, person.last, person.email, person.token);
    const result = await ensureUser({ ...person, lotId, passwordHash });
    console.log(
      `${person.first} ${person.last} <${person.email}> — ${result.created ? "created" : "updated"} (id ${result.id})`,
    );
  }

  console.log(`Password for newly created accounts: ${DEMO_PASSWORD}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to ensure board reviewers:", err);
    process.exit(1);
  });
