import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import VendorCard from "./VendorCard";
import { apiFetch } from "../../api";
import styles from "./VendorDirectory.module.css";

export default function VendorDirectory() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    apiFetch("/api/vendors")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setVendors([]);
          setError(data.error || "Could not load trusted companies.");
          return;
        }
        setVendors(Array.isArray(data) ? data : []);
        setError("");
      })
      .catch(() => {
        setVendors([]);
        setError("Network error loading trusted companies.");
      })
      .finally(() => setLoading(false));
  }, []);

  const types = useMemo(() => {
    const unique = [...new Set(vendors.map((item) => item.service_type).filter(Boolean))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [vendors]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return vendors.filter((item) => {
      if (filter !== "all" && item.service_type !== filter) return false;
      if (!needle) return true;
      const haystack = [
        item.company_name,
        item.service_type,
        item.contact_phone,
        item.contact_email,
        item.notes,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [vendors, filter, query]);

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <div>
          <p className={styles.kicker}>Neighbors</p>
          <h2>Trusted companies</h2>
          <p>
            Companies the board has used or would call. This is a starting point, not a promise
            about every job — still get your own bid.
          </p>
        </div>
      </header>

      {loading ? (
        <p className={styles.empty}>Loading companies…</p>
      ) : error ? (
        <p className={styles.empty}>{error}</p>
      ) : vendors.length === 0 ? (
        <p className={styles.empty}>The board has not listed any companies yet.</p>
      ) : (
        <>
          <div className={styles.tools}>
            <label className={styles.search}>
              <Search size={16} />
              <input
                type="search"
                placeholder="Name, trade, or phone…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className={styles.filters}>
              <button
                type="button"
                className={filter === "all" ? styles.filterOn : ""}
                onClick={() => setFilter("all")}
              >
                All
              </button>
              {types.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={filter === type ? styles.filterOn : ""}
                  onClick={() => setFilter(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <p className={styles.empty}>No companies match that.</p>
          ) : (
            <div className={styles.grid}>
              {visible.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
