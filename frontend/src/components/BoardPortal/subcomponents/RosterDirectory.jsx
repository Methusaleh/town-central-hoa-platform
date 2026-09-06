import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Download, Mail, Search } from "lucide-react";
import Button from "../../ui/Button";
import { apiFetch } from "../../../api";
import styles from "./RosterDirectory.module.css";

const EMPTY_FORM = {
  street_address: "",
  first_name: "",
  last_name: "",
  email: "",
};

const EMPTY_TRANSFER = {
  first_name: "",
  last_name: "",
  email: "",
  send_welcome: true,
};

function householdOf(lot) {
  return Array.isArray(lot?.household) ? lot.household : [];
}

function displayName(person) {
  return `${person?.first_name || ""} ${person?.last_name || ""}`.trim() || "Household";
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function lotHasEmail(lot) {
  if (lot?.email) return true;
  return householdOf(lot).some((person) => person.email);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function downloadClaimPacket(lots) {
  const header = [
    "street_address",
    "first_name",
    "last_name",
    "email",
    "claim_code",
    "status",
    "household_emails",
  ];
  const rows = lots.map((lot) => [
    lot.street_address,
    lot.first_name,
    lot.last_name,
    lot.email || "",
    lot.onboarding_token || "",
    lot.is_claimed ? "claimed" : "unclaimed",
    householdOf(lot)
      .map((person) => person.email)
      .filter(Boolean)
      .join("; "),
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "town-central-household-packet.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function RosterDirectory({ onBack }) {
  const [lots, setLots] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: "", text: "" });
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [transfer, setTransfer] = useState(EMPTY_TRANSFER);
  const [showTransfer, setShowTransfer] = useState(false);
  const [compose, setCompose] = useState("");
  const [composeAudience, setComposeAudience] = useState("households");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");
  const [mobileDetail, setMobileDetail] = useState(false);
  const [selectedPeople, setSelectedPeople] = useState([]);

  const selected = lots.find((lot) => String(lot.id) === String(selectedId)) || null;

  const loadLots = async () => {
    try {
      const res = await apiFetch("/api/residents/master-list-placeholder");
      const data = await res.json();
      if (res.ok) {
        const list = Array.isArray(data) ? data : [];
        setLots(list);
        setSelectedId((current) => {
          if (current && list.some((lot) => String(lot.id) === String(current))) return current;
          return list[0]?.id || null;
        });
      }
    } catch (err) {
      console.error("Roster fetch error:", err);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    loadLots();
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return lots;
    return lots.filter((lot) => {
      const members = householdOf(lot)
        .map((person) => `${person.first_name} ${person.last_name} ${person.email}`)
        .join(" ");
      return `${lot.first_name} ${lot.last_name} ${lot.street_address} ${lot.email || ""} ${members}`
        .toLowerCase()
        .includes(needle);
    });
  }, [lots, query]);

  const toggleOne = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
    setMobileDetail(true);
  };

  const togglePerson = (person, street) => {
    setSelectedPeople((current) =>
      current.some((item) => item.id === person.id)
        ? current.filter((item) => item.id !== person.id)
        : [...current, { id: person.id, email: person.email, name: displayName(person), street }],
    );
    setMobileDetail(true);
  };

  const selectByStatus = (statusType) => {
    if (statusType === "all") setSelectedIds(lots.map((lot) => lot.id));
    else if (statusType === "claimed") setSelectedIds(lots.filter((lot) => lot.is_claimed).map((lot) => lot.id));
    else if (statusType === "unclaimed") setSelectedIds(lots.filter((lot) => !lot.is_claimed).map((lot) => lot.id));
    else {
      setSelectedIds([]);
      setSelectedPeople([]);
    }
    setCompose("");
    setEmailStatus("");
    setMobileDetail(statusType !== "clear");
  };

  const openLot = (lot) => {
    if (selectedIds.length > 0 || selectedPeople.length > 0) return;
    setSelectedId(lot.id);
    setMobileDetail(true);
    setShowTransfer(false);
    setInviteEmail("");
  };

  const handleCopy = async (value, key) => {
    const ok = await copyText(value);
    if (ok) {
      setCopied(key);
      setTimeout(() => setCopied(""), 1600);
    }
  };

  const saveLot = async (sendWelcome) => {
    if (!form.street_address.trim() || saving) return;
    setSaving(true);
    setStatus({ type: "", text: "" });
    try {
      const res = await apiFetch("/api/residents", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          send_welcome: sendWelcome,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCreated(data.resident);
        setStatus({
          type: "ok",
          text: sendWelcome && data.resident?.email
            ? "Lot saved and claim letter sent. Each household member keeps their own login."
            : "Lot saved. Copy the claim code or email the letter when you have an address.",
        });
        setForm(EMPTY_FORM);
        await loadLots();
        setSelectedId(data.resident?.id || null);
        setMobileDetail(true);
      } else if (res.status === 409) {
        setStatus({ type: "err", text: data.error || "That street is already listed." });
        if (data.lot?.id) {
          setSelectedId(data.lot.id);
          setMobileDetail(true);
          setShowForm(false);
        }
        await loadLots();
      } else {
        setStatus({ type: "err", text: data.error || "Could not save that lot." });
      }
    } catch {
      setStatus({ type: "err", text: "Network error saving the lot." });
    } finally {
      setSaving(false);
    }
  };

  const resendClaim = async (lot) => {
    try {
      const res = await apiFetch(`/api/residents/lots/${lot.id}/resend-claim`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      setStatus({
        type: res.ok ? "ok" : "err",
        text: data.message || data.error || (res.ok ? "Claim letter sent." : "Could not send the letter."),
      });
    } catch {
      setStatus({ type: "err", text: "Network error sending the claim letter." });
    }
  };

  const inviteMember = async (e) => {
    e.preventDefault();
    if (!selected || !inviteEmail.trim()) return;
    try {
      const res = await apiFetch("/api/residents/invite", {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail.trim(), address: selected.street_address }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setInviteEmail("");
        setStatus({
          type: "ok",
          text: "Invite sent. They will keep their own login and receive board mail to this street.",
        });
      } else {
        setStatus({ type: "err", text: data.error || "Could not send that invite." });
      }
    } catch {
      setStatus({ type: "err", text: "Network error sending the invite." });
    }
  };

  const transferLot = async (e) => {
    e.preventDefault();
    if (!selected) return;
    try {
      const res = await apiFetch(`/api/residents/lots/${selected.id}/transfer`, {
        method: "POST",
        body: JSON.stringify(transfer),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowTransfer(false);
        setTransfer(EMPTY_TRANSFER);
        setCreated(data.resident);
        setStatus({
          type: "ok",
          text: data.message || "Owner transferred.",
        });
        await loadLots();
      } else {
        setStatus({ type: "err", text: data.error || "Could not transfer this lot." });
      }
    } catch {
      setStatus({ type: "err", text: "Network error transferring this lot." });
    }
  };

  const removeLogin = async (person) => {
    if (!window.confirm(`Remove ${displayName(person)}'s login? They will lose access until invited again.`)) return;
    try {
      const res = await apiFetch(`/api/residents/account/${person.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus({ type: "ok", text: "Login removed." });
        await loadLots();
      } else {
        setStatus({ type: "err", text: data.error || "Could not remove that login." });
      }
    } catch {
      setStatus({ type: "err", text: "Network error removing that login." });
    }
  };

  const sendBroadcast = async (e, kind, audience) => {
    e.preventDefault();
    setSending(true);
    setEmailStatus("Sending…");
    try {
      const res = await apiFetch("/api/residents/broadcast", {
        method: "POST",
        body: JSON.stringify(
          audience === "people"
            ? {
                targetType: "people",
                selectedEmails: selectedPeople.map((person) => person.email).filter(Boolean),
                subject,
                message,
                kind,
              }
            : {
                targetType: "selected",
                selectedIds,
                subject,
                message,
                kind,
              },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEmailStatus(data.message || "Sent.");
        setSubject("");
        setMessage("");
        setCompose("");
      } else {
        setEmailStatus(data.error || "Could not send that message.");
      }
    } catch {
      setEmailStatus("Network error sending mail.");
    } finally {
      setSending(false);
    }
  };

  const emailClaimCodes = async () => {
    setSending(true);
    setEmailStatus("Sending claim letters…");
    try {
      const res = await apiFetch("/api/residents/lots/bulk-claim-letters", {
        method: "POST",
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json().catch(() => ({}));
      setEmailStatus(data.message || data.error || "Could not send those letters.");
    } catch {
      setEmailStatus("Network error sending claim letters.");
    } finally {
      setSending(false);
    }
  };

  const claimedCount = lots.filter((lot) => lot.is_claimed).length;
  const loginCount = lots.reduce((sum, lot) => sum + householdOf(lot).length, 0);
  const batchMode = selectedIds.length > 0 || selectedPeople.length > 0;
  const selectedLots = lots.filter((lot) => selectedIds.includes(lot.id));
  const reachableLots = selectedLots.filter(lotHasEmail);
  const printLots = selectedLots.filter((lot) => !lotHasEmail(lot));
  const claimEmailLots = selectedLots.filter((lot) => !lot.is_claimed && lot.email && lot.onboarding_token);
  const claimPrintLots = selectedLots.filter((lot) => !lot.is_claimed && (!lot.email || !lot.onboarding_token));

  const startCompose = (kind, audience = "households") => {
    setCompose(kind);
    setComposeAudience(audience);
    setEmailStatus("");
    if (kind === "newsletter" && !subject) setSubject("Town Central Newsletter");
  };

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={onBack}>
        <ArrowLeft size={16} />
        Admin tools
      </button>

      <header className={styles.intro}>
        <div>
          <p className={styles.kicker}>Neighborhood</p>
          <h2>Household roster</h2>
          <p>
            One listing per street. Everyone who lives there keeps their own login, shares the
            household portal, and is included when you email that address.
          </p>
        </div>
        <div className={styles.summary}>
          <div>
            <span>Lots</span>
            <strong>{lots.length}</strong>
          </div>
          <div>
            <span>Claimed</span>
            <strong>{claimedCount}</strong>
          </div>
          <div>
            <span>Logins</span>
            <strong>{loginCount}</strong>
          </div>
        </div>
      </header>

      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => setShowForm((open) => !open)}>
          {showForm ? "Close add-lot form" : "Add a lot"}
        </Button>
      </div>

      {showForm && (
        <section className={styles.formCard}>
          <h3>Add a lot</h3>
          <p>If this street is already listed, invite another household member instead of creating a second row.</p>
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              saveLot(false);
            }}
          >
            <label>
              Street address
              <input
                value={form.street_address}
                onChange={(e) => setForm({ ...form, street_address: e.target.value })}
                placeholder="742 Evergreen Terrace"
                required
              />
            </label>
            <div className={styles.formRow}>
              <label>
                Occupant first name
                <input
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  placeholder="Optional"
                />
              </label>
              <label>
                Occupant last name
                <input
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  placeholder="Optional"
                />
              </label>
            </div>
            <label>
              Email for the claim letter
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Optional"
              />
            </label>
            <div className={styles.formActions}>
              <Button type="submit" disabled={saving}>Save lot</Button>
              <Button
                type="button"
                variant="secondary"
                disabled={saving || !form.email}
                onClick={() => saveLot(true)}
              >
                Save and email claim letter
              </Button>
            </div>
          </form>
        </section>
      )}

      {status.text && <p className={status.type === "ok" ? styles.ok : styles.err}>{status.text}</p>}

      {created?.onboarding_token && (
        <section className={styles.codeCard}>
          <div>
            <span>Claim code for {created.street_address}</span>
            <strong>{created.onboarding_token}</strong>
          </div>
          <div className={styles.codeActions}>
            <Button
              variant="secondary"
              onClick={() => handleCopy(created.onboarding_token, "created")}
            >
              <Copy size={16} />
              {copied === "created" ? "Copied" : "Copy code"}
            </Button>
            {created.email && (
              <Button variant="ghost" onClick={() => resendClaim(created)}>
                Resend letter
              </Button>
            )}
          </div>
        </section>
      )}

      <div className={`${styles.workspace} ${mobileDetail && (batchMode || selected) ? styles.workspaceDetail : ""}`}>
        <section className={styles.roll}>
          <div className={styles.tools}>
            <label className={styles.search}>
              <Search size={16} />
              <input
                type="search"
                placeholder="Name, street, or household email…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className={styles.filters}>
              <button type="button" className={selectedIds.length === lots.length && lots.length ? styles.filterOn : ""} onClick={() => selectByStatus("all")}>Select all</button>
              <button type="button" onClick={() => selectByStatus("claimed")}>Select claimed</button>
              <button type="button" onClick={() => selectByStatus("unclaimed")}>Select unclaimed</button>
              <button type="button" onClick={() => selectByStatus("clear")}>Clear</button>
            </div>
          </div>

          {!loaded ? (
            <p className={styles.empty}>Loading households…</p>
          ) : visible.length === 0 ? (
            <p className={styles.empty}>No households match that.</p>
          ) : (
            <div className={styles.list}>
              {visible.map((lot) => {
                const members = householdOf(lot);
                const checked = selectedIds.includes(lot.id);
                const peopleOn = members.some((person) => selectedPeople.some((item) => item.id === person.id));
                return (
                  <div
                    key={lot.id}
                    className={`${styles.rowBlock} ${
                      batchMode
                        ? checked || peopleOn ? styles.rowOn : ""
                        : String(lot.id) === String(selectedId) ? styles.rowOn : ""
                    }`}
                  >
                    <div className={styles.row}>
                      <label className={styles.check}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOne(lot.id)}
                        />
                      </label>
                      <button type="button" className={styles.rowMain} onClick={() => openLot(lot)}>
                        <strong>{lot.street_address}</strong>
                      </button>
                      <em className={lot.is_claimed ? styles.claimed : styles.pending}>
                        {lot.is_claimed ? "Claimed" : "Pending"}
                      </em>
                    </div>
                    <ul className={styles.memberList}>
                      {members.length === 0 ? (
                        <li className={styles.memberMuted}>{displayName(lot)} · no login yet</li>
                      ) : (
                        members.map((person) => (
                          <li key={person.id}>
                            <label>
                              <input
                                type="checkbox"
                                checked={selectedPeople.some((item) => item.id === person.id)}
                                onChange={() => togglePerson(person, lot.street_address)}
                                disabled={!person.email}
                              />
                              <span>{displayName(person)}</span>
                            </label>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className={styles.desk}>
          <button type="button" className={styles.mobileBack} onClick={() => setMobileDetail(false)}>
            <ArrowLeft size={16} />
            All households
          </button>

          {batchMode ? (
            <>
              <div className={styles.accountHead}>
                <div>
                  <h3>
                    {selectedPeople.length > 0 && selectedLots.length > 0
                      ? `${selectedPeople.length} people · ${selectedLots.length} streets`
                      : selectedPeople.length > 0
                        ? `${selectedPeople.length} ${selectedPeople.length === 1 ? "person" : "people"} selected`
                        : `${selectedLots.length} household${selectedLots.length === 1 ? "" : "s"} selected`}
                  </h3>
                  <p>
                    Check a name to email that person only. Check a street for household mail, claim letters, and the CSV packet.
                  </p>
                </div>
                <Button variant="ghost" onClick={() => selectByStatus("clear")}>Clear selection</Button>
              </div>

              {selectedPeople.length > 0 && (
                <>
                  <h4 className={styles.sectionLabel}>People</h4>
                  <ul className={styles.review}>
                    {selectedPeople.map((person) => (
                      <li key={person.id}>
                        <div>
                          <strong>{person.name}</strong>
                          <span>{person.street}{person.email ? ` · ${person.email}` : " · no email"}</span>
                        </div>
                        <button type="button" onClick={() => togglePerson({ id: person.id, email: person.email, first_name: person.name, last_name: "" }, person.street)}>Remove</button>
                      </li>
                    ))}
                  </ul>
                  <div className={styles.formActions}>
                    <Button
                      onClick={() => startCompose("email", "people")}
                      disabled={!selectedPeople.some((person) => person.email)}
                    >
                      <Mail size={16} />
                      Email these people
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => startCompose("newsletter", "people")}
                      disabled={!selectedPeople.some((person) => person.email)}
                    >
                      Newsletter to these people
                    </Button>
                  </div>
                </>
              )}

              {selectedLots.length > 0 && (
                <>
                  <h4 className={styles.sectionLabel}>Streets</h4>
                  <p className={styles.emptyInline}>
                    Household email goes to every login at these streets. Streets without an email stay on the
                    CSV for hand delivery.
                  </p>
                  <ul className={styles.review}>
                    {selectedLots.map((lot) => (
                      <li key={lot.id}>
                        <div>
                          <strong>{lot.street_address}</strong>
                          <span>
                            {displayName(lot)}
                            {lotHasEmail(lot)
                              ? ` · ${lot.email || householdOf(lot).map((person) => person.email).filter(Boolean)[0]}`
                              : " · no email — print packet"}
                          </span>
                        </div>
                        <button type="button" onClick={() => toggleOne(lot.id)}>Remove</button>
                      </li>
                    ))}
                  </ul>
                  <div className={styles.formActions}>
                    <Button onClick={() => startCompose("email", "households")} disabled={reachableLots.length === 0}>
                      <Mail size={16} />
                      Email households
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => startCompose("newsletter", "households")}
                      disabled={reachableLots.length === 0}
                    >
                      Newsletter
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={sending || claimEmailLots.length === 0}
                      onClick={emailClaimCodes}
                    >
                      Email claim codes
                    </Button>
                    <Button variant="secondary" onClick={() => downloadClaimPacket(selectedLots)}>
                      <Download size={16} />
                      Download CSV
                    </Button>
                  </div>
                  {claimPrintLots.length > 0 && (
                    <p className={styles.emptyInline}>
                      {claimPrintLots.length} unclaimed street{claimPrintLots.length === 1 ? "" : "s"} have no email.
                      Use the CSV to print claim codes for door-drop.
                    </p>
                  )}
                </>
              )}

              {(compose === "email" || compose === "newsletter") && (
                <form className={styles.form} onSubmit={(e) => sendBroadcast(e, compose, composeAudience)}>
                  <h4>
                    {composeAudience === "people"
                      ? compose === "newsletter"
                        ? "Newsletter to selected people"
                        : "Email selected people"
                      : compose === "newsletter"
                        ? "Send newsletter to households"
                        : "Email households"}
                  </h4>
                  <p>
                    {composeAudience === "people"
                      ? `${selectedPeople.filter((person) => person.email).length} people will receive this.`
                      : `${reachableLots.length} household${reachableLots.length === 1 ? "" : "s"} will receive this.${
                          printLots.length
                            ? ` ${printLots.length} without email will not. Download the CSV for those streets.`
                            : ""
                        }`}
                  </p>
                  <label>
                    Subject
                    <input value={subject} onChange={(e) => setSubject(e.target.value)} required />
                  </label>
                  <label>
                    Message
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} required />
                  </label>
                  <div className={styles.formActions}>
                    <Button type="submit" disabled={sending}>
                      {sending ? "Sending…" : compose === "newsletter" ? "Send newsletter" : "Send email"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setCompose("")}>Cancel</Button>
                  </div>
                </form>
              )}

              {emailStatus && <p className={emailStatus.toLowerCase().includes("could not") || emailStatus.toLowerCase().includes("error") || emailStatus.toLowerCase().includes("no claim") ? styles.err : styles.ok}>{emailStatus}</p>}
            </>
          ) : !selected ? (
            <p className={styles.empty}>Choose a street, or use the filters to work a batch.</p>
          ) : (
            <>
              <div className={styles.accountHead}>
                <div>
                  <h3>{selected.street_address}</h3>
                  <p>{displayName(selected)}{selected.email ? ` · ${selected.email}` : ""}</p>
                </div>
                <em className={selected.is_claimed ? styles.claimed : styles.pending}>
                  {selected.is_claimed ? "Claimed" : "Pending"}
                </em>
              </div>

              <div className={styles.codeRow}>
                <div>
                  <span>Claim code</span>
                  <strong>{selected.onboarding_token || "—"}</strong>
                </div>
                {selected.onboarding_token && (
                  <Button
                    variant="secondary"
                    onClick={() => handleCopy(selected.onboarding_token, "selected")}
                  >
                    <Copy size={16} />
                    {copied === "selected" ? "Copied" : "Copy"}
                  </Button>
                )}
                {selected.email && (
                  <Button variant="ghost" onClick={() => resendClaim(selected)}>
                    Email letter
                  </Button>
                )}
              </div>

              <div className={styles.household}>
                <h4>Household logins</h4>
                <p>
                  These people use the same household access for dues and board mail. Each person
                  still signs in separately for The Porch and the rest of the site.
                </p>
                {householdOf(selected).length === 0 ? (
                  <p className={styles.emptyInline}>No logins yet. Send a claim letter or invite someone onto this lot.</p>
                ) : (
                  <ul>
                    {householdOf(selected).map((person) => (
                      <li key={person.id}>
                        <div>
                          <strong>{displayName(person)}</strong>
                          <span>{person.email}</span>
                        </div>
                        <button type="button" onClick={() => removeLogin(person)}>
                          Remove login
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <form className={styles.invite} onSubmit={inviteMember}>
                <label>
                  Invite another household member
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="their@email.com"
                    required
                  />
                </label>
                <Button type="submit">Send invite</Button>
              </form>

              {showTransfer ? (
                <form className={styles.form} onSubmit={transferLot}>
                  <h4>Transfer owner</h4>
                  <p>Issues a new claim code. Existing logins stay until you remove them.</p>
                  <div className={styles.formRow}>
                    <label>
                      First name
                      <input
                        value={transfer.first_name}
                        onChange={(e) => setTransfer({ ...transfer, first_name: e.target.value })}
                        required
                      />
                    </label>
                    <label>
                      Last name
                      <input
                        value={transfer.last_name}
                        onChange={(e) => setTransfer({ ...transfer, last_name: e.target.value })}
                        required
                      />
                    </label>
                  </div>
                  <label>
                    Email
                    <input
                      type="email"
                      value={transfer.email}
                      onChange={(e) => setTransfer({ ...transfer, email: e.target.value })}
                    />
                  </label>
                  <label className={styles.checkLabel}>
                    <input
                      type="checkbox"
                      checked={transfer.send_welcome}
                      onChange={(e) => setTransfer({ ...transfer, send_welcome: e.target.checked })}
                    />
                    Email the new claim letter
                  </label>
                  <div className={styles.formActions}>
                    <Button type="submit">Save transfer</Button>
                    <Button type="button" variant="ghost" onClick={() => setShowTransfer(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <Button variant="secondary" onClick={() => setShowTransfer(true)}>
                  Transfer owner
                </Button>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
