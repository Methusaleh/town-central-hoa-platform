# Town Central — application overview for the board

This is the neighborhood site for Town Central: households, documents, notices, events, The Porch, requests, and a board desk. It is a self-managed HOA tool, not a management-company platform and not a bank.

**Live site:** https://towncentralhoa.org

---

## What neighbors get

| Area | What it does |
|---|---|
| Claim a lot | One street, one claim code. First adult activates, then can invite others at that address. Each person keeps their own login. |
| Home | What’s true today: live alert, next event, Porch, dues, shortcuts. |
| The Porch | Neighborhood posts, photos, family-filtered GIFs, comments, reactions. Board members appear as themselves. |
| Events | Gatherings and meetings with a real page, cover photo, RSVP, add to Google / Apple / Outlook. |
| Announcements | From the board. Can be pinned. |
| Alerts | Time-sensitive: lost pet, street, safety. Poster or board closes them (Found / Street is open / All clear). Closed items leave Home but stay under Resolved. |
| Documents | Neighbor library only — folders that actually have files. Board-only folders never appear here. |
| My Dues | Balance and how to pay: bank bill-pay or check. No card checkout. |
| ARC & maintenance | Fence, paint, a leak — a ticket the board can resolve. |
| Trusted companies | Vendors the board has listed. |
| Pool & clubhouse | Coming soon. Not a reservation system yet. |
| Contact the board | Write the board from inside the site. |
| Profile | Photo, password, household invite. |

## What the board gets (on a personal login)

Admin unlocks when that person’s role is `board_member` or `super_admin`. Same login they use as a neighbor.

| Tool | What it does |
|---|---|
| Master roster | One row per street. CSV import. Claim codes. Door-drop PDFs. Invites and owner transfer. Household mail. |
| Document Manager | Nested folders. Dump a folder of files. **For neighbors** vs **Board only**. |
| Assessment ledger | Charges, payments, aging, CSV. Record checks. Does not take cards. |
| Operations | Open / resolve ARC and maintenance tickets. |
| Vendor controls | Who shows on Trusted companies. |
| Moderation | Take down a Porch post, announcement, or alert that violates guidelines. |

`admin@towncentralhoa.org`, `board@towncentralhoa.org`, and `billing@towncentralhoa.org` are **mailboxes**. They are not shared site logins. Several board members can work in Document Manager at the same time only if each has their own login.

---

## How a household gets on the site

1. The lot is on the roster (typed in, or CSV — vacant rows are fine for the new phase).
2. They get a claim code: email if you have one, door-drop flyer if you don’t.
3. They set a password at `/claim`. The code is one-use.
4. Anyone else at that address is **invited** after. They are not a second roster row.

That matches how the neighborhood actually works: one house, more than one adult, no shared password.

---

## What is not in this product (on purpose or not yet)

| Topic | Status | What to tell neighbors |
|---|---|---|
| Credit cards / Stripe | Out. Stripe may still exist in code; it is not how dues work. | Pay by bank bill-pay or check. |
| Routing / lockbox numbers | Placeholder copy until the treasurer posts real numbers. | “We’ll put the payee details here before we collect through the portal.” |
| Pool / clubhouse booking | Coming-soon page only. | Not open, not reservable. |
| SMS / text alerts | A profile toggle exists. It does not send texts. | Email and the site for now. |
| Management-company accounting | No. Ledger is what the board records. | This is not AppFolio. |
| Shared `board@` login | Do not do this. | One person, one login, a role on that login. |

---

## Questions the board will have

**Who owns the data?**  
The HOA. Roster, documents, and ledger live in your database and file storage. If you later hire a manager, you can export. Write down who holds the hosting and `admin@` passwords.

**Is this private?**  
Neighbors are signed in. Board-only folders are hidden from resident Docs. The Porch is the neighborhood, not the open web. Do not post attorney-client or collections strategy on The Porch.

**Can we require it?**  
You can run roster, docs, and dues instructions here. You cannot make someone social. Door-drop covers households without email.

**What if two people need Admin?**  
Give each of them `board_member` on their personal login. Do not share one password.

**What if a post is inappropriate?**  
Board remove, with a reason. Image scanning when production keys are on. Closing a lost-pet alert as Found is different — that is “taken care of,” not “taken down.”

**Will this replace email?**  
No. `board@` / `billing@` still matter for people who write the HOA. The site is the shared record: who lives where, what was posted, what was paid.

**What happens at go-live?**  
Import the real roster, set board roles on real people, post real payee details, confirm image scanning is on in production, and tell neighbors how to claim (email + a door-drop weekend).

---

## Stack — what we run, and whether it is the right size

| Piece | Job | Why this | Watch-outs |
|---|---|---|---|
| React + Vite (Vercel) | The website | Fast, cheap, custom domain at towncentralhoa.org | Someone has to click deploy / own the Vercel account |
| Express on Cloud Run | The API | Scales down when quiet; fits an HOA that is not “always on” | Cold starts; needs the env vars set in Cloud Run, not only on a laptop |
| Neon Postgres | Roster, users, ledger, posts | Serverless SQL, backups, enough for hundreds of lots | Do not treat the demo seed as production data |
| Cloudflare R2 | Photos, documents, avatars | Object storage, low cost, no surprise egress like some clouds | Files are only as private as the URLs and the app’s permissions |
| Zoho Mail | `admin@` / `board@` / `billing@` and outbound claim/welcome mail | You already have the domain mailboxes | IMAP/Lite cost if you want Outlook; keep mailboxes separate from site logins |
| JWT sessions | Stay signed in ~7 days | Simple | Password reset exists; no two-factor yet |
| Giphy | GIF search on The Porch | Family rating (`g`) | Rate limits on free keys |
| Sightengine + OpenAI (optional) | Image and text screening | Stops the worst photos/copy when keys are set | **If keys are missing, scans are skipped and the post goes through** |

**Cost / benefit in plain terms**

Commercial HOA suites (AppFolio, BuildingLink, a full management company portal) are built for managers: lockbox, violation workflows, owner packets, sometimes $thousands a year plus a management fee. Town Central is a small, owned site for a self-run board. Hosting for this size of neighborhood is typically a **low two-digit monthly** bill (site + database + files), plus **mail** you were going to pay for anyway (~$36/year for three Zoho Lite seats if you want IMAP on all three boxes).

What you are buying is control and fit: one row per street, door-drop for people without email, no fake “pay now” button. What you are not buying is a staffed management office, automated ACH drafting, or legally reviewed collections software.

**When this stack would be the wrong call:** if the board hires a manager who already requires their own portal, or if you need bank-grade payment processing inside the app. Then you either integrate their system or stop collecting through this site.

---

## Safety, NSFW, and real risks

**What is in place**

- Community guidelines at first login.
- Image scan (nudity, weapons, gore) on Porch, alerts, announcements, events, and avatars — **when Sightengine keys are set**. If the scanner is down, those uploads are **blocked** (fail closed).
- Text screening on some posts when an OpenAI key is set; if it is not set, text is not scanned.
- GIFs only from Giphy, rating `g`. Arbitrary GIF URLs are not a back door.
- Board can remove content. Alerts can also be closed as resolved without deleting the history.
- Documents are **not** scanned. That is the right default for PDFs of covenants; it is the wrong default if someone uploads a photo into Document Manager.

**Risks to be honest about**

1. **Keys off = scan off.** Local or production without Sightengine will accept images. Before neighbors live on the site, confirm Cloud Run has the keys. Unset is convenient for development and unsafe for go-live.
2. **Scanners are not perfect.** They miss things and they false-positive (a beach photo, a kid in a swimsuit). The board still has to moderate.
3. **The Porch is social.** A determined person can be unkind in words. Text scan helps only if the OpenAI key is on. Culture and board remove matter more than the API.
4. **Public file URLs.** R2 public URLs are hard to guess but not a vault. Do not put Social Security files or owner packets with bank details in the neighbor library.
5. **Flag-to-delete.** Alerts currently disappear after enough neighbor flags. That can be abused (pile-on) or helpful (spam). Worth a board policy: maybe flags should only alert the board.
6. **No two-factor.** Fine for an HOA of this size; weaker if a board login is also the person who can delete documents. Use unique passwords; consider 2FA after go-live for board roles.
7. **Children.** The site is a neighborhood, not a kids’ app. Guidelines and scanning reduce risk; they do not create a COPPA program.

**Recommendation:** treat safety as “good enough to launch with a present board,” not “set and forget.” Assign one board member who will actually look at Report / Remove.

---

## After go-live — useful next, not now

These would help once the roster is real and people are claiming. None of them should block the first meeting.

1. **Real payee details on My Dues** — the one item neighbors will judge you on. Treasurer routing / lockbox, then the placeholder copy comes down.
2. **Board 2FA or passkeys** — small cost, protects Document Manager and the ledger.
3. **True SMS for lost pet / safety** — Twilio (or similar) plus a real opt-in. The profile toggle is a stub; turning it on without a vendor would be dishonest. Budget: a few cents per text, plus a monthly number.
4. **Alert end dates** — street and weather could auto-drop off Home after a date. Lost pets should stay until someone marks Found.
5. **Pool booking** — only when the pool exists. Rules, guest limits, household-only holds. Easy to over-build before there is water.
6. **Export / backup drill** — roster CSV you already have; add a periodic download of documents and a written “who has Vercel / Neon / Zoho.”
7. **Turn off or hide the SMS and newsletter checkboxes** until they do something, so the board is not promising texts.

---

## Suggested decision at this meeting

- Approve **personal board logins** (no shared `board@` on the site).
- Approve **bill-pay + check** as the payment story, with a date for posting numbers.
- Approve **go-live shape:** roster import + claim weekend + neighbor vs board docs.
- Park pool booking, SMS, and card pay until there is a real need.
