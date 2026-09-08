# Town Central — board demo checklist

Use this as the run-of-show. Walk it as a neighbor first, then as a named board member. Do not log in as `admin@`, `board@`, or `billing@` during the demo — those are mailboxes, not shared site accounts.

**Site:** https://towncentralhoa.org  
**Time:** about 40–50 minutes, plus questions  
**Browsers:** two windows (or one window + one private window) so a resident and a board member can both stay signed in.

---

## Before they sit down

- [ ] Confirm production is up (login, Home, one document, one event).
- [ ] Have a **personal resident login** ready (your own household, or a named demo neighbor).
- [ ] Have a **board member login** ready (Chris-shaped: one person, `board_member`, their real street). Not `board@`.
- [ ] Keep `admin@` off the projector. That login is for site work, not the neighborhood.
- [ ] Pick one **unclaimed lot** with a claim code (or a door-drop flyer PDF) so you can show claiming.
- [ ] Know the honest answers: pool is not bookable yet; dues routing/account numbers are not posted yet; texts are not sending yet.

### Do not

- Do not promise in-app card payments. Dues are bank bill-pay and check.
- Do not show Document Manager while logged in as a shared mailbox.
- Do not treat a board badge on The Porch as a feature. Chris posts as Chris.
- Do not invent lockbox or routing numbers live.

---

## 1. Neighbor walk (about 20 minutes)

Log in as a regular household. Stay here until they have seen neighborhood life without Admin.

- [ ] **Public site.** Landing page, claim, contact. This is what a new buyer sees.
- [ ] **Claim a lot.** Street + name. Optional email. One claim code per household, one use. After activate, invite a second adult (spouse) onto the same street — they get their own login.
- [ ] **Home.** Greeting, what’s true today, live alert banner if there is one, featured event, Porch teaser, dues chip. Click the alert card — it should open that alert, not a blank page.
- [ ] **The Porch.** Neighbors talking. Photo. GIF from Giphy (family filter). No board label on names.
- [ ] **Events.** Open a gathering (not just the list). RSVP. Add to Google / Apple / Outlook.
- [ ] **Announcements.** Board posts, pinned if you have one.
- [ ] **Alerts.** Lost pet / street / safety. Poster or board can mark Found, Street is open, or All clear. Resolved items leave Home and sit under Resolved. Neighbors cannot close someone else’s alert.
- [ ] **Docs.** Folders with files, nested where you set them. Empty folders hidden. They should **not** see Legal / Insurance / Vendors.
- [ ] **My Dues.** Balance, past-due days if any, bill-pay and check copy. Routing still “posted by the treasurer before go-live.”
- [ ] **ARC & maintenance.** Submit a request. This is how a fence or a leak gets to the board.
- [ ] **Trusted companies.** Vendor list the board maintains.
- [ ] **Pool & clubhouse.** Coming soon — hours and reservations are not live.
- [ ] **Contact the board.** Message from inside the site.
- [ ] **Profile.** Photo, password, invite someone else at this address. Skip SMS as a live feature (the toggle is not sending texts yet).

**If they ask here:** “Can two people at the house share one password?” No. One street, two logins. “Will I see board-only legal files?” No.

---

## 2. Board member walk (about 20 minutes)

Sign in as Chris (or whoever will actually run the site). Same person they already know from The Porch. **Admin** appears in the nav. Porch still says Chris.

- [ ] **Admin home.** Roster, documents, ledger, tickets, vendors — one place.
- [ ] **Master roster.** One row per street. Occupied vs vacant (Pending). Claimed vs not. Household logins under the street.
- [ ] **Add or import.** CSV for occupied streets and new-phase vacant lots. Duplicate streets skipped. Optional claim emails.
- [ ] **Door-drop.** Select unclaimed lots → Door-drop PDF (one letter-size page per house, claim URL). Or a single flyer from a lot.
- [ ] **Invite / transfer.** Second adult on a claimed house is an invite, not a second roster row. Transfer issues a new claim code.
- [ ] **Document Manager.** Dump a folder of files. **For neighbors** vs **Board only**. Confirm a board folder does not show in resident Docs.
- [ ] **Assessment ledger.** Household balances, aging, record a check, CSV if you use it. No Stripe.
- [ ] **Operations / tickets.** Open an ARC from the neighbor walk and resolve it.
- [ ] **Vendor controls.** Add or hide a company.
- [ ] **Broadcast / letters.** Claim letters, welcome letters, household email from the roster (don’t spam the whole neighborhood on the projector).
- [ ] **Close an alert.** From the board login, mark a safety or street item all clear. Home banner should drop it.

**If they ask here:** “Can we all share `board@` to log in?” No. Each board member gets their own login with the board role. `board@` stays a mailbox.

---

## 3. Questions they will almost certainly ask

| Question | Answer |
|---|---|
| Who can see what? | Neighbors see neighborhood life and **For neighbors** documents. Board members see that plus Admin and **Board only** folders. |
| Who is the “HOA login”? | There isn’t one for daily use. People sign in as themselves. `admin@` is for whoever maintains the site. |
| How does a new house get on the site? | Roster row (CSV or add lot) → claim code (email or door-drop) → they set a password → optional invite for a spouse. |
| How do we collect dues? | Bank bill-pay and check. The portal shows the balance. Real routing / lockbox numbers go up when the treasurer is ready. No cards in the app. |
| What if someone posts something ugly? | Board can take down Porch posts, announcements, and alerts. Images are scanned when the safety keys are on. Neighbors can flag some items. Closing an alert (Found / All clear) is not the same as a moderation remove. |
| Is the pool in this? | A coming-soon page only. Booking after the pool exists. |
| What does this cost vs AppFolio / a management company? | This stack is a small hosting bill (site, database, files, mail). It is not a full property-manager package. See the overview doc. |
| What if Aaron is hit by a bus? | The board still has the data (roster, docs, ledger) in the app. Hosting logins and the `admin@` mailbox need a written handoff. Put that on the go-live list. |
| Can we require everyone to use it? | You can put the roster on it and collect dues through the instructions on My Dues. You cannot force a neighbor onto The Porch. Door-drop still works for people without email. |

---

## 4. Close the meeting

- [ ] Repeat what is **live today** vs **not yet** (pool booking, SMS, card pay, lockbox numbers).
- [ ] Ask who will be the first board logins (names, not a shared inbox).
- [ ] Ask when the treasurer will give routing / payee details to post on My Dues.
- [ ] Leave the overview document for cost, safety, and after-go-live ideas.

---

## Local seed shortcuts (only if you are demoing on localhost)

Demo resident password: `Neighborhood1`

| Login | Role | Use for |
|---|---|---|
| `priya.shah@example.com` | Resident | Household with two logins (Anika too) |
| `elena.ruiz@example.com` | Board member | Chris-shaped Admin walk |
| `riley.ortiz@example.com` | Resident | Can mark Juniper **Found** |
| `admin@towncentralhoa.org` | Super admin | Site work only — not the projector |

Unclaimed with email: 1601 Post Oak (`POST1`), 1808 Whispering Creek (`WHIS2`).  
Door-drop only: 1624 Post Oak (`POST2`), 1918 Sycamore Court (`SYCA2`).
