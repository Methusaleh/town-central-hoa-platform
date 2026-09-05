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

export default function FinancialLedger({ onBack, user }) {
  const [accounts, setAccounts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyTick, setHistoryTick] = useState(0);
  const [mobileDetail, setMobileDetail] = useState(false);

  const selected = accounts.find((item) => String(item.id) === String(selectedId)) || null;

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
    if (!selected?.street_address) {
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
  }, [selected?.street_address, historyTick]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return accounts.filter((item) => {
      const tone = statusTone(item);
      if (filter === "due" && tone !== "due") return false;
      if (filter === "paid" && tone !== "paid") return false;
      if (filter === "none" && tone !== "none") return false;
      if (!needle) return true;
      const haystack = `${item.household || ""} ${item.street_address || ""} ${item.lot_number || ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [accounts, filter, query]);

  const dueCount = accounts.filter((item) => statusTone(item) === "due").length;
  const outstanding = accounts.reduce((sum, item) => sum + Math.max(0, Number(item.balance) || 0), 0);

  const openAccount = (account) => {
    setSelectedId(account.id);
    setMobileDetail(true);
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

      <div className={`${styles.workspace} ${mobileDetail && selected ? styles.workspaceDetail : ""}`}>
        <section className={styles.roll}>
          <div className={styles.tools}>
            <label className={styles.search}>
              <Search size={16} />
              <input
                type="search"
                placeholder="Name, street, or lot…"
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
              {visible.map((account) => (
                <button
                  key={account.id}
                  type="button"
                  className={`${styles.row} ${String(account.id) === String(selectedId) ? styles.rowOn : ""}`}
                  onClick={() => openAccount(account)}
                >
                  <div className={styles.rowCopy}>
                    <strong>{account.household || "Household"}</strong>
                    <span>
                      {account.street_address}
                      {account.lot_number ? ` · Lot ${account.lot_number}` : ""}
                    </span>
                  </div>
                  <div className={styles.rowMoney}>
                    <b className={styles[statusTone(account)]}>{money(account.balance)}</b>
                    <em>{statusLabel(account)}</em>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className={styles.desk}>
          {!selected ? (
            <p className={styles.empty}>Choose a household to log a payment or charge.</p>
          ) : (
            <>
              <button type="button" className={styles.mobileBack} onClick={() => setMobileDetail(false)}>
                <ArrowLeft size={16} />
                All households
              </button>
              <div className={styles.accountHead}>
                <div>
                  <h3>{selected.household || "Household"}</h3>
                  <p>
                    {selected.street_address}
                    {selected.lot_number ? ` · Lot ${selected.lot_number}` : ""}
                  </p>
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
