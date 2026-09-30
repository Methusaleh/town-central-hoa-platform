/**
 * Wipe demo neighborhood data and keep only the real operator logins.
 *
 * Do not TRUNCATE neighborhood_roster with CASCADE — users.roster_lot_id
 * references that table, and CASCADE would delete every login.
 *
 * Run from backend/:
 *   CONFIRM=GO_LIVE node db/reset-for-golive.js
 */
require("dotenv").config();
const { Pool } = require("pg");

const KEEP_EMAILS = ["admin@towncentralhoa.org", "stacey.burris@example.com"];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});

async function reset() {
  if (process.env.CONFIRM !== "GO_LIVE") {
    throw new Error("Refusing to run. Set CONFIRM=GO_LIVE to wipe demo neighborhood data.");
  }

  const keepList = KEEP_EMAILS.map((email) => email.toLowerCase());
  const client = await pool.connect();
  try {
    const kept = await client.query(
      `SELECT id, email FROM users WHERE lower(email) = ANY($1::text[])`,
      [keepList],
    );
    if (kept.rows.length !== keepList.length) {
      const found = new Set(kept.rows.map((row) => row.email.toLowerCase()));
      const missing = keepList.filter((email) => !found.has(email));
      throw new Error(`Refusing to wipe: missing keep-list login(s): ${missing.join(", ")}`);
    }

    await client.query("BEGIN");
    await client.query(
      `UPDATE users
          SET roster_lot_id = NULL
        WHERE lower(email) = ANY($1::text[])`,
      [keepList],
    );

    await client.query(`
      TRUNCATE
        alert_comments,
        announcement_comments,
        announcements,
        community_alerts,
        request_comments,
        community_requests,
        documents,
        document_categories,
        event_rsvps,
        invitations,
        ledger_transactions,
        neighborhood_events,
        password_reset_tokens,
        porch_comments,
        porch_posts,
        resident_dues,
        verified_vendors
      RESTART IDENTITY CASCADE
    `);

    await client.query("DELETE FROM neighborhood_roster");

    const removed = await client.query(
      `DELETE FROM users
        WHERE lower(email) <> ALL($1::text[])
        RETURNING email`,
      [keepList],
    );

    await client.query(
      `UPDATE users
          SET address = 'Town Central HOA',
              role = 'super_admin',
              agreed_to_guidelines = true
        WHERE lower(email) = 'admin@towncentralhoa.org'`,
    );
    await client.query(
      `UPDATE users
          SET address = 'HOA Services of Oklahoma',
              role = 'board_member',
              agreed_to_guidelines = true
        WHERE lower(email) = 'stacey.burris@example.com'`,
    );

    await client.query(
      `INSERT INTO document_categories (name, parent_id, audience)
       SELECT v.name, NULL, 'board'
         FROM (VALUES ('Legal'), ('Insurance'), ('Vendors')) AS v(name)
        WHERE NOT EXISTS (
          SELECT 1 FROM document_categories c
           WHERE c.name = v.name AND COALESCE(c.audience, 'residents') = 'board'
        )`,
    );

    await client.query("COMMIT");
    return removed.rows.map((row) => row.email);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

reset()
  .then(async (removed) => {
    const users = await pool.query(
      `SELECT id, first_name, last_name, email, role, address
         FROM users
        ORDER BY id`,
    );
    const roster = await pool.query(`SELECT count(*)::int AS n FROM neighborhood_roster`);
    console.log(`Removed ${removed.length} demo login${removed.length === 1 ? "" : "s"}.`);
    console.log("Kept:");
    users.rows.forEach((user) => {
      console.log(`  ${user.role}  ${user.email}  ${user.first_name} ${user.last_name}  (${user.address})`);
    });
    console.log(`Roster lots: ${roster.rows[0].n}`);
    await pool.end();
  })
  .catch(async (err) => {
    console.error(err.message || err);
    await pool.end().catch(() => {});
    process.exit(1);
  });
