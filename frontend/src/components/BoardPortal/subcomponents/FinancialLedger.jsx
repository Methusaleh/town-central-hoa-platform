import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import AdminPaymentForm from "./AdminPaymentForm";
import { apiFetch } from "../../../api";
import styles from "./FinancialLedger.module.css";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "due", label: "Balance due" },
  { id: "paid", label: "Paid" },
  { id: "none", label: "No record" },
];

function money(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return "$0.00";
  return amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function statusTone(account) {
  const balance = Number(account?.balance || 0);
  if (balance > 0) return "due";
  if (!account?.status || account.status === "No Record") return "none";
  return "paid";
}

function statusLabel(account) {
  const tone = statusTone(account);
  if (tone === "due") return "Balance due";
  if (tone === "paid") return "Paid";
  return "No record";
}

function membersOf(account) {
  return Array.isArray(account?.members) ? account.members : [];
}

function memberNames(account) {
  const members = membersOf(account);
  if (members.length) {
    return members
      .map((person) => `${person.first_name || ""} ${person.last_name || ""}`.trim())
      .filter(Boolean);
  }
  const listed = String(account?.household || "").trim();
  return listed && listed !== "Household" ? [listed] : [];
}

export default function FinancialLedger({ onBack, user }) {
  const [accounts, setAccounts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [selectedStreets, setSelectedStreets] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyTick, setHistoryTick] = useState(0);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkStatus, setBulkStatus] = useState({ type: "", text: "" });
  const [bulkSending, setBulkSending] = useState(false);

  const selected = accounts.find((item) => String(item.id) === String(selectedId)) || null;
  const bulkMode = selectedStreets.length > 0;
  const selectedAccounts = accounts.filter((item) => selectedStreets.includes(item.street_address));

  const loadAccounts = async () => {
    try {
      const res = await apiFetch("/api/dues/admin/overview");
      const data = await res.json();
      if (res.ok) {
        const list = Array.isArray(data.accounts) ? data.accounts : [];
        setAccounts(list);
        setSelectedId((current) => {
          if (current && list.some((item) => String(item.id) === String(current))) return current;
          const firstDue = list.find((item) => Number(item.balance) > 0);
          return (firstDue || list[0])?.id || null;
        });
      }
    } catch (err) {
      console.error("Ledger overview error:", err);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (bulkMode || !selected?.street_address) {
      setHistory([]);
      return undefined;
    }
    let cancelled = false;
    apiFetch(`/api/dues/history/${encodeURIComponent(selected.street_address)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setHistory(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Ledger history error:", err);
        if (!cancelled) setHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selected?.street_address, historyTick, bulkMode]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return accounts.filter((item) => {
      const tone = statusTone(item);
      if (filter === "due" && tone !== "due") return false;
      if (filter === "paid" && tone !== "paid") return false;
      if (filter === "none" && tone !== "none") return false;
      if (!needle) return true;
      const haystack = `${memberNames(item).join(" ")} ${item.street_address || ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [accounts, filter, query]);

  const dueCount = accounts.filter((item) => statusTone(item) === "due").length;
  const outstanding = accounts.reduce((sum, item) => sum + Math.max(0, Number(item.balance) || 0), 0);

  const openAccount = (account) => {
    if (selectedStreets.length > 0) return;
    setSelectedId(account.id);
    setMobileDetail(true);
  };

  const toggleStreet = (street) => {
    setSelectedStreets((current) =>
      current.includes(street) ? current.filter((item) => item !== street) : [...current, street],
    );
    setMobileDetail(true);
  };

  const postBulkCharge = async (e) => {
    e.preventDefault();
    if (!selectedStreets.length || !bulkAmount || bulkSending) return;
    setBulkSending(true);
    setBulkStatus({ type: "", text: "" });
    try {
      const res = await apiFetch("/api/dues/bulk-charge", {
        method: "POST",
        body: JSON.stringify({
          street_addresses: selectedStreets,
          amount: Number(bulkAmount),
          reference_note: bulkNote || "Bulk household charge",
          admin_name: user?.first_name || "Board Treasurer",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setBulkStatus({ type: "ok", text: data.message || "Charges posted." });
        setBulkAmount("");
        setBulkNote("");
        loadAccounts();
        setHistoryTick((n) => n + 1);
      } else {
        setBulkStatus({ type: "err", text: data.error || "Could not post those charges." });
      }
    } catch {
      setBulkStatus({ type: "err", text: "Network error posting bulk charges." });
    } finally {
      setBulkSending(false);
    }
  };

  return (
    <div className={styles.page}>
      <button type="button" className={styles.back} onClick={onBack}>
        <ArrowLeft size={16} />
        Admin tools
      </button>

      <header className={styles.intro}>
        <div>
          <p className={styles.kicker}>Treasurer</p>
          <h2>Assessment ledger</h2>
          <p>Find a household, see what they owe, and log a check or charge in one place.</p>
        </div>
        <div className={styles.summary}>
          <div>
            <span>Outstanding</span>
            <strong>{money(outstanding)}</strong>
          </div>
          <div>
            <span>Balances due</span>
            <strong>{dueCount}</strong>
          </div>
          <div>
            <span>Households</span>
            <strong>{accounts.length}</strong>
          </div>
        </div>
      </header>

      <div className={`${styles.workspace} ${mobileDetail && (bulkMode || selected) ? styles.workspaceDetail : ""}`}>
        <section className={styles.roll}>
          <div className={styles.tools}>
            <label className={styles.search}>
              <Search size={16} />
              <input
                type="search"
                placeholder="Name or street…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className={styles.filters}>
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={filter === item.id ? styles.filterOn : ""}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {!loaded ? (
            <p className={styles.empty}>Loading households…</p>
          ) : visible.length === 0 ? (
            <p className={styles.empty}>No households match that.</p>
          ) : (
            <div className={styles.list}>
              {visible.map((account) => {
                const names = memberNames(account);
                return (
                <div
                  key={account.id}
                  className={`${styles.rowBlock} ${
                    bulkMode
                      ? selectedStreets.includes(account.street_address) ? styles.rowOn : ""
                      : String(account.id) === String(selectedId) ? styles.rowOn : ""
                  }`}
                >
                  <div className={styles.row}>
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={selectedStreets.includes(account.street_address)}
                        onChange={() => toggleStreet(account.street_address)}
                      />
                    </label>
                    <button type="button" className={styles.rowMain} onClick={() => openAccount(account)}>
                      <div className={styles.rowCopy}>
                        <strong>{account.street_address}</strong>
                      </div>
                      <div className={styles.rowMoney}>
                        <b className={styles[statusTone(account)]}>{money(account.balance)}</b>
                        <em>{statusLabel(account)}</em>
                      </div>
                    </button>
                  </div>
                  <ul className={styles.memberList}>
                    {membersOf(account).length === 0 && names.length === 0 ? (
                      <li className={styles.memberMuted}>No logins yet</li>
                    ) : membersOf(account).length > 0 ? (
                      membersOf(account).map((person) => (
                        <li key={person.id}>
                          {`${person.first_name || ""} ${person.last_name || ""}`.trim() || person.email}
                        </li>
                      ))
                    ) : (
                      names.map((name) => <li key={name}>{name}</li>)
                    )}
                  </ul>
                </div>
                );
              })}
            </div>
          )}
        </section>

        <section className={styles.desk}>
          {bulkMode ? (
            <>
              <button type="button" className={styles.mobileBack} onClick={() => setMobileDetail(false)}>
                <ArrowLeft size={16} />
                All households
              </button>
              <div className={styles.accountHead}>
                <div>
                  <h3>Charge {selectedAccounts.length} household{selectedAccounts.length === 1 ? "" : "s"}</h3>
                  <p>Review the list here, then post one amount to all of them.</p>
                </div>
                <button type="button" className={styles.clear} onClick={() => setSelectedStreets([])}>
                  Clear selection
                </button>
              </div>

              <ul className={styles.review}>
                {selectedAccounts.map((account) => (
                  <li key={account.id}>
                    <div>
                      <strong>{account.street_address}</strong>
                      <span>
                        {memberNames(account).join(", ") || "No logins yet"}
                        {" · "}
                        {money(account.balance)}
                      </span>
                    </div>
                    <button type="button" onClick={() => toggleStreet(account.street_address)}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>

              <form className={styles.bulk} onSubmit={postBulkCharge}>
                <label>
                  Amount
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={bulkAmount}
                    onChange={(e) => setBulkAmount(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Memo
                  <input
                    type="text"
                    placeholder="e.g. 2026 annual assessment"
                    value={bulkNote}
                    onChange={(e) => setBulkNote(e.target.value)}
                  />
                </label>
                <button type="submit" disabled={bulkSending}>
                  {bulkSending ? "Posting…" : `Post charge to ${selectedAccounts.length} household${selectedAccounts.length === 1 ? "" : "s"}`}
                </button>
                {bulkStatus.text && (
                  <p className={bulkStatus.type === "ok" ? styles.paid : styles.due}>{bulkStatus.text}</p>
                )}
              </form>
            </>
          ) : !selected ? (
            <p className={styles.empty}>Choose a household, or check several to post a bulk charge.</p>
          ) : (
            <>
              <button type="button" className={styles.mobileBack} onClick={() => setMobileDetail(false)}>
                <ArrowLeft size={16} />
                All households
              </button>
              <div className={styles.accountHead}>
                <div>
                  <h3>{selected.street_address}</h3>
                  <p>{memberNames(selected).join(", ") || "No logins yet"}</p>
                </div>
                <div className={styles.balanceCard}>
                  <span>Current balance</span>
                  <strong className={styles[statusTone(selected)]}>{money(selected.balance)}</strong>
                  <em>{statusLabel(selected)}</em>
                </div>
              </div>

              <AdminPaymentForm
                user={user}
                street_address={selected.street_address}
                currentBalance={Number(selected.balance) || 0}
                onPaymentSuccess={() => {
                  loadAccounts();
                  setHistoryTick((n) => n + 1);
                }}
              />

              <div className={styles.history}>
                <h4>Ledger</h4>
                {history.length === 0 ? (
                  <p className={styles.empty}>No payments or charges posted yet.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Note</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.created_at ? new Date(entry.created_at).toLocaleDateString() : "—"}</td>
                          <td className={styles.cap}>
                            {entry.transaction_type}
                            {entry.payment_method ? ` · ${entry.payment_method}` : ""}
                          </td>
                          <td>{entry.reference_note || "—"}</td>
                          <td className={entry.transaction_type === "charge" ? styles.due : styles.paid}>
                            {entry.transaction_type === "charge" ? "+" : "−"}
                            {money(entry.amount).replace("$", "")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
