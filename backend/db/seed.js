/**
 * Demo neighborhood data. Keeps admin@towncentralhoa.org and replaces everything else.
 *
 * Run from backend/:  npm run seed
 * Demo resident password: Neighborhood1
 */
require("dotenv").config();
const bcrypt = require("bcrypt");
const db = require("./index");

const ADMIN_EMAIL = "admin@towncentralhoa.org";
const DEMO_PASSWORD = "Neighborhood1";

async function seed() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const adminRes = await db.query(
    `SELECT first_name, last_name, email, address, role, password_hash,
            agreed_to_guidelines, profile_photo
     FROM users WHERE lower(email) = $1`,
    [ADMIN_EMAIL],
  );
  const admin = adminRes.rows[0];
  if (!admin?.password_hash) {
    throw new Error(`Refusing to seed: ${ADMIN_EMAIL} was not found. Restore that login first.`);
  }

  let adminId;
  await db.query("BEGIN");
  try {
    await db.query(`
      TRUNCATE
        alert_comments,
        announcement_comments,
        announcements,
        community_alerts,
        community_requests,
        documents,
        document_categories,
        event_rsvps,
        invitations,
        ledger_transactions,
        maintenance_requests,
        neighborhood_events,
        neighborhood_notifications,
        neighborhood_roster,
        password_reset_tokens,
        porch_comments,
        porch_posts,
        resident_dues,
        verified_vendors,
        users
      RESTART IDENTITY CASCADE
    `);

    const restored = await db.query(
      `INSERT INTO users
        (first_name, last_name, email, address, role, password_hash, agreed_to_guidelines, profile_photo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        admin.first_name || "HOA",
        admin.last_name || "Administration",
        ADMIN_EMAIL,
        admin.address || "1559 Hickory Trl",
        "super_admin",
        admin.password_hash,
        true,
        admin.profile_photo || null,
      ],
    );
    adminId = restored.rows[0].id;
    await db.query("COMMIT");
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }

  const households = [
    {
      street: "1559 Hickory Trl",
      occupant: ["HOA", "Administration", ADMIN_EMAIL],
      claimed: true,
      token: "ADMIN1",
      dues: { balance: 0, status: "Paid" },
      charges: [{ amount: 450, note: "2026 annual assessment", type: "charge" }, { amount: 450, note: "Check 1042", type: "payment" }],
      members: [],
    },
    {
      street: "1488 Cedar Ridge",
      occupant: ["Priya", "Shah", "priya.shah@example.com"],
      claimed: true,
      token: "CEDAR1",
      dues: { balance: 0, status: "Paid" },
      charges: [{ amount: 450, note: "2026 annual assessment", type: "charge" }, { amount: 450, note: "Online bill pay", type: "payment" }],
      members: [
        ["Priya", "Shah", "priya.shah@example.com", "resident"],
        ["Anika", "Shah", "anika.shah@example.com", "resident"],
      ],
    },
    {
      street: "1420 Hickory Trl",
      occupant: ["Maya", "Chen", "maya.chen@example.com"],
      claimed: true,
      token: "HICK2",
      dues: { balance: 450, status: "Pending" },
      charges: [{ amount: 450, note: "2026 annual assessment", type: "charge" }],
      members: [
        ["Maya", "Chen", "maya.chen@example.com", "resident"],
        ["Wei", "Chen", "wei.chen@example.com", "resident"],
      ],
    },
    {
      street: "1512 Maple Hollow",
      occupant: ["Jordan", "Hale", "jordan.hale@example.com"],
      claimed: true,
      token: "MAPLE1",
      dues: { balance: 1200, status: "Pending" },
      charges: [
        { amount: 450, note: "2025 annual assessment", type: "charge" },
        { amount: 750, note: "Special assessment — fence", type: "charge" },
      ],
      members: [["Jordan", "Hale", "jordan.hale@example.com", "resident"]],
    },
    {
      street: "1702 Redbud Lane",
      occupant: ["Sam", "Ortiz", "sam.ortiz@example.com"],
      claimed: true,
      token: "REDB1",
      dues: null,
      charges: [],
      members: [
        ["Sam", "Ortiz", "sam.ortiz@example.com", "resident"],
        ["Riley", "Ortiz", "riley.ortiz@example.com", "resident"],
        ["Noah", "Ortiz", "noah.ortiz@example.com", "resident"],
      ],
    },
    {
      street: "1730 Redbud Lane",
      occupant: ["Chris", "Nguyen", "chris.nguyen@example.com"],
      claimed: true,
      token: "REDB2",
      dues: { balance: 85, status: "Pending" },
      charges: [{ amount: 85, note: "Late fee", type: "charge" }],
      members: [["Chris", "Nguyen", "chris.nguyen@example.com", "resident"]],
    },
    {
      street: "1822 Whispering Creek",
      occupant: ["Elena", "Ruiz", "elena.ruiz@example.com"],
      claimed: true,
      token: "WHIS1",
      dues: { balance: 0, status: "Paid" },
      charges: [{ amount: 450, note: "2026 annual assessment", type: "charge" }, { amount: 450, note: "Check 881", type: "payment" }],
      members: [["Elena", "Ruiz", "elena.ruiz@example.com", "board_member"]],
    },
    {
      street: "1904 Sycamore Court",
      occupant: ["Taylor", "Brooks", "taylor.brooks@example.com"],
      claimed: true,
      token: "SYCA1",
      dues: { balance: 0, status: "Paid" },
      charges: [{ amount: 450, note: "2026 annual assessment", type: "charge" }, { amount: 450, note: "Check 220", type: "payment" }],
      members: [
        ["Taylor", "Brooks", "taylor.brooks@example.com", "resident"],
        ["Quinn", "Brooks", "quinn.brooks@example.com", "resident"],
      ],
    },
    {
      street: "1601 Post Oak",
      occupant: ["Avery", "Patel", "avery.patel@example.com"],
      claimed: false,
      token: "POST1",
      dues: { balance: 450, status: "Pending" },
      charges: [{ amount: 450, note: "2026 annual assessment", type: "charge" }],
      members: [],
    },
    {
      street: "1624 Post Oak",
      occupant: ["Pending", "Resident", null],
      claimed: false,
      token: "POST2",
      dues: null,
      charges: [],
      members: [],
    },
    {
      street: "1808 Whispering Creek",
      occupant: ["Morgan", "Lee", "morgan.lee@example.com"],
      claimed: false,
      token: "WHIS2",
      dues: { balance: 450, status: "Pending" },
      charges: [{ amount: 450, note: "2026 annual assessment", type: "charge" }],
      members: [],
    },
    {
      street: "1918 Sycamore Court",
      occupant: ["Pending", "Resident", null],
      claimed: false,
      token: "SYCA2",
      dues: null,
      charges: [],
      members: [],
    },
    {
      street: "1101 Town Central Cir",
      occupant: ["Danelle", "Delp", "danelle.delp@example.com"],
      claimed: true,
      token: "DEL1",
      dues: { balance: 0, status: "Paid" },
      charges: [{ amount: 450, note: "2026 annual assessment", type: "charge" }, { amount: 450, note: "Check 310", type: "payment" }],
      members: [["Danelle", "Delp", "danelle.delp@example.com", "board_member"]],
    },
    {
      street: "1108 Town Central Cir",
      occupant: ["Christopher", "Cunningham", "chris.cunningham@example.com"],
      claimed: true,
      token: "CUN1",
      dues: { balance: 0, status: "Paid" },
      charges: [{ amount: 450, note: "2026 annual assessment", type: "charge" }, { amount: 450, note: "Check 311", type: "payment" }],
      members: [["Christopher", "Cunningham", "chris.cunningham@example.com", "board_member"]],
    },
    {
      street: "1114 Town Central Cir",
      occupant: ["Cole", "Schaffitzel", "cole.schaffitzel@example.com"],
      claimed: true,
      token: "SCH1",
      dues: { balance: 0, status: "Paid" },
      charges: [{ amount: 450, note: "2026 annual assessment", type: "charge" }, { amount: 450, note: "Check 312", type: "payment" }],
      members: [["Cole", "Schaffitzel", "cole.schaffitzel@example.com", "board_member"]],
    },
  ];

  const lotIds = {};
  for (const home of households) {
    const { rows } = await db.query(
      `INSERT INTO neighborhood_roster
        (street_address, first_name, last_name, email, is_claimed, onboarding_token)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [home.street, home.occupant[0], home.occupant[1], home.occupant[2], home.claimed, home.token],
    );
    lotIds[home.street] = rows[0].id;

    if (home.dues) {
      await db.query(
        `INSERT INTO resident_dues (street_address, balance, status, last_payment_date, next_due_date)
         VALUES ($1, $2, $3, $4, '2026-12-31')`,
        [
          home.street,
          home.dues.balance,
          home.dues.status,
          home.dues.status === "Paid" ? "2026-03-12" : null,
        ],
      );
    }

    for (const charge of home.charges) {
      await db.query(
        `INSERT INTO ledger_transactions
          (address, amount, transaction_type, payment_method, reference_note, created_by, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          home.street,
          charge.amount,
          charge.type,
          charge.type === "payment" ? "check" : "system",
          charge.note,
          "Board Treasurer",
          charge.type === "payment" ? "2026-03-12" : "2026-01-15",
        ],
      );
    }
  }

  await db.query(
    `UPDATE users
     SET address = $1, roster_lot_id = $2, agreed_to_guidelines = true, role = 'super_admin'
     WHERE id = $3`,
    ["1559 Hickory Trl", lotIds["1559 Hickory Trl"], adminId],
  );

  const usersByEmail = { [ADMIN_EMAIL]: { id: adminId, first: admin.first_name, last: admin.last_name } };

  for (const home of households) {
    for (const [first, last, email, role] of home.members) {
      const { rows } = await db.query(
        `INSERT INTO users
          (first_name, last_name, email, address, role, password_hash, agreed_to_guidelines, roster_lot_id)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7)
         RETURNING id`,
        [first, last, email, home.street, role, passwordHash, lotIds[home.street]],
      );
      usersByEmail[email] = { id: rows[0].id, first, last };
    }
  }

  const uid = (email) => usersByEmail[email].id;
  const name = (email) => `${usersByEmail[email].first} ${usersByEmail[email].last}`;

  await db.query(
    `INSERT INTO announcements (title, content, priority, channel_type, is_sticky, created_at)
     VALUES
      ($1, $2, 'high', 'board', true, '2026-09-01'),
      ($3, $4, 'normal', 'board', false, '2026-08-20'),
      ($5, $6, 'normal', 'board', false, '2026-07-12')`,
    [
      "Pool hours change for Labor Day weekend",
      "The pool stays open until 9pm Friday through Monday. Guest passes are still two per household. Please walk bikes past the gate.",
      "September board meeting is on the 16th",
      "We meet at 7pm in the clubhouse. The packet is in Documents → Meeting Minutes. Come with questions about the fence special assessment.",
      "Irrigation repairs on Hickory",
      "Crews will be on Hickory Trail next Tuesday morning. Driveways may be blocked for an hour at a time.",
    ],
  );

  const porch = await db.query(
    `INSERT INTO porch_posts (author_name, author_email, content, reactions, created_at)
     VALUES
      ($1, $2, $3, $4::jsonb, '2026-09-05 18:12'),
      ($5, $6, $7, $8::jsonb, '2026-09-04 09:40'),
      ($9, $10, $11, $12::jsonb, '2026-09-02 16:05')
     RETURNING id`,
    [
      "Priya Shah",
      "priya.shah@example.com",
      "Anyone else in for a Saturday morning walk around the pond? Bringing extra leashes.",
      JSON.stringify({ "👍": ["maya.chen@example.com", "elena.ruiz@example.com"], "🙌": ["anika.shah@example.com"] }),
      "Jordan Hale",
      "jordan.hale@example.com",
      "Have a stack of leftover pavers by the garage if a neighbor can use them this weekend.",
      JSON.stringify({ "❤️": ["sam.ortiz@example.com"] }),
      "Maya Chen",
      "maya.chen@example.com",
      "Tomato plants took off. Come grab a few on the porch at 1420 if you want them.",
      JSON.stringify({ "👍": ["priya.shah@example.com", "taylor.brooks@example.com"] }),
    ],
  );
  await db.query(
    `INSERT INTO porch_comments (post_id, author_name, content, created_at)
     VALUES
      ($1, 'Anika Shah', 'I can do 8am. Meet at the north bench?', '2026-09-05 18:40'),
      ($1, 'Elena Ruiz', 'Save me a spot — walking the long loop.', '2026-09-05 19:02'),
      ($2, 'Sam Ortiz', 'I will swing by Saturday before noon.', '2026-09-04 10:15')`,
    [porch.rows[0].id, porch.rows[1].id],
  );

  const alerts = await db.query(
    `INSERT INTO community_alerts (category, author, author_email, content, created_at)
     VALUES
      ('Lost Pet', 'Riley Ortiz', 'riley.ortiz@example.com', 'Orange tabby, answers to Juniper. Last seen near 1702 Redbud around 6:30pm. Shy but will come for treats.', '2026-09-05 19:10'),
      ('Traffic / Party', 'Chris Nguyen', 'chris.nguyen@example.com', 'Extra cars parked along Redbud tonight for a birthday. Please leave the hydrant clear.', '2026-09-05 16:22'),
      ('Safety Alert', 'Elena Ruiz', 'elena.ruiz@example.com', 'Storm blew a limb across the sidewalk on Whispering Creek by the mail kiosk. City ticket is in; walk around the grass until it is gone.', '2026-09-04 08:05')
     RETURNING id, category`,
  );
  const lostPet = alerts.rows.find((row) => row.category === "Lost Pet");
  const traffic = alerts.rows.find((row) => row.category === "Traffic / Party");
  await db.query(
    `UPDATE community_alerts
     SET resolved_at = '2026-09-06 09:12',
         resolved_by = 'Chris Nguyen',
         resolved_label = 'Street is open'
     WHERE id = $1`,
    [traffic.id],
  );
  await db.query(
    `INSERT INTO alert_comments (alert_id, author_name, content, created_at)
     VALUES
      ($1, 'Maya Chen', 'Thought I saw a tabby behind the clubhouse dumpster around 8.', '2026-09-05 20:01'),
      ($1, 'Taylor Brooks', 'Checked our garage. Not here, but porch light is on if they wander this way.', '2026-09-05 20:44')`,
    [lostPet.id],
  );

  const events = await db.query(
    `INSERT INTO neighborhood_events
      (title, description, event_date, event_time, location, category, event_type, details)
     VALUES
      ('Fall cookout', 'Board provides burgers. Bring a side if you can. Kids welcome.', '2026-09-20', '17:00', 'Clubhouse lawn', 'cookout', 'cookout', '{"bring":"side dish"}'::jsonb),
      ('September board meeting', 'Agenda: fence assessment, pool season wrap-up, and the fall newsletter.', '2026-09-16', '19:00', 'Clubhouse', 'meeting', 'meeting', '{}'::jsonb),
      ('Pond walk', 'Easy loop. Dogs on leash. Meet at the north bench.', '2026-09-13', '08:00', 'North pond bench', 'gathering', 'gathering', '{}'::jsonb),
      ('Kids chalk night', 'Bring sidewalk chalk. We will have extra.', '2026-09-26', '18:30', 'Clubhouse drive', 'kids', 'kids', '{}'::jsonb)
     RETURNING id, title`,
  );
  const cookout = events.rows.find((row) => row.title === "Fall cookout");
  const walk = events.rows.find((row) => row.title === "Pond walk");
  const rsvps = [
    [cookout.id, "priya.shah@example.com"],
    [cookout.id, "anika.shah@example.com"],
    [cookout.id, "maya.chen@example.com"],
    [cookout.id, "elena.ruiz@example.com"],
    [walk.id, "priya.shah@example.com"],
    [walk.id, "elena.ruiz@example.com"],
  ];
  for (const [eventId, email] of rsvps) {
    await db.query(
      "INSERT INTO event_rsvps (event_id, user_id, display_name) VALUES ($1, $2, $3)",
      [eventId, uid(email), name(email)],
    );
  }

  await db.query(
    `INSERT INTO community_requests
      (resident_id, first_name, last_name, request_type, subject, description, status, created_at, resolved_at, resolved_by)
     VALUES
      ($1, 'Jordan', 'Hale', 'maintenance', 'Streetlight out on Maple Hollow', 'The light at the corner of Maple Hollow and Hickory has been dark for two nights.', 'Open', '2026-09-03', NULL, NULL),
      ($2, 'Maya', 'Chen', 'home_change', 'Fence stain color', 'We would like to restain the backyard fence in Sherwin Weathered Teak. Sample is on the gate.', 'Open', '2026-09-01', NULL, NULL),
      ($3, 'Chris', 'Nguyen', 'maintenance', 'Irrigation head flooding sidewalk', 'Head by the mailbox sprays the sidewalk every morning around 6.', 'Resolved', '2026-08-12', '2026-08-18', 'HOA Administration')`,
    [uid("jordan.hale@example.com"), uid("maya.chen@example.com"), uid("chris.nguyen@example.com")],
  );

  await db.query(
    `INSERT INTO verified_vendors (company_name, service_type, contact_phone, contact_email, website_url, notes)
     VALUES
      ('Red Dirt Irrigation', 'Irrigation', '405-555-0142', 'hello@reddirtirrigation.example', 'https://example.com', 'Used for the Hickory repair. Shows up.'),
      ('Piedmont Fence Co.', 'Fencing', '405-555-0198', 'jobs@piedmontfence.example', NULL, 'Knows the HOA stain spec.'),
      ('Quiet Hours HVAC', 'HVAC', '405-555-0110', 'service@quiethours.example', NULL, 'Good with tight lot lines.'),
      ('Oak & Stone Landscaping', 'Landscaping', '405-555-0166', 'crew@oakandstone.example', NULL, 'Does the common-area mowing.')`,
  );

  const folders = await db.query(
    `INSERT INTO document_categories (name, parent_id, audience)
     VALUES
      ('Covenants', NULL, 'residents'),
      ('Meeting Minutes', NULL, 'residents'),
      ('Pool', NULL, 'residents'),
      ('Legal', NULL, 'board'),
      ('Insurance', NULL, 'board'),
      ('Vendors', NULL, 'board')
     RETURNING id, name`,
  );
  const minutes = folders.rows.find((row) => row.name === "Meeting Minutes");
  await db.query(
    "INSERT INTO document_categories (name, parent_id, audience) VALUES ($1, $2, 'residents')",
    ["2026", minutes.id],
  );

  await db.query(
    `INSERT INTO invitations (email, token, primary_resident_id, address, is_used)
     VALUES ('guest.ortiz@example.com', $1, $2, '1702 Redbud Lane', false)`,
    ["demoinvite00", uid("sam.ortiz@example.com")],
  );

  console.log(`Seed complete. Kept ${ADMIN_EMAIL}.`);
  console.log("Demo resident password: Neighborhood1");
  console.log("Board review logins: danelle.delp@example.com, chris.cunningham@example.com, cole.schaffitzel@example.com");
  console.log("Unclaimed with email: 1601 Post Oak (POST1), 1808 Whispering Creek (WHIS2)");
  console.log("Unclaimed, door-drop only: 1624 Post Oak (POST2), 1918 Sycamore Court (SYCA2)");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
