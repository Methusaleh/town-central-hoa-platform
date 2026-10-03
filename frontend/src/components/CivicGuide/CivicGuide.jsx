import { useEffect, useState } from "react";
import { API_URL } from "../../api";
import styles from "./CivicGuide.module.css";

const FALLBACK = [
  {
    columnId: "emergency",
    column: "Emergency",
    cards: [
      { id: "emergency_911", title: "Life, fire, crime in progress", detail: "Call 911", phone: "911", bullets: ["Medical emergency", "Fire", "Break-in or violence"] },
      { id: "emergency_police", title: "Non-emergency police", detail: "Piedmont Police", phone: "", bullets: ["Noise after hours", "Suspicious activity that is not in progress"] },
    ],
  },
  {
    columnId: "city",
    column: "City of Piedmont",
    cards: [
      { id: "city_code", title: "Code enforcement", detail: "City Hall", phone: "", bullets: ["Tall grass on a private lot the city covers", "Illegal parking on a public street"] },
      { id: "city_works", title: "Utilities & public works", detail: "Public Works", phone: "", bullets: ["Water main / meter issues", "City trash pickup", "Street lights on a public street"] },
    ],
  },
  {
    columnId: "hoa",
    column: "Town Central HOA",
    cards: [
      { id: "hoa_change", title: "Change to a house", detail: "Submit a request", phone: "", bullets: ["Fence, paint, addition", "Anything that changes the view from the street"] },
      { id: "hoa_common", title: "Common areas & dues", detail: "Board", phone: "", bullets: ["Common-area repair", "Dues questions", "Covenant questions"] },
    ],
  },
];

function phoneHref(phone) {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

export default function CivicGuide() {
  const [columns, setColumns] = useState(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/site/civic-guide`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setColumns(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!columns?.length) return null;

  return (
    <section className={styles.section}>
      <h2>Who to call</h2>
      <p className={styles.lede}>
        If it is dangerous right now, call emergency services. If it is a city service, call Piedmont. Use Town Central for association business.
      </p>

      <div className={styles.container}>
        {columns.map((column) => (
          <div key={column.columnId} className={styles.column}>
            <h3>{column.column}</h3>
            {(column.cards || []).map((card) => {
              const href = phoneHref(card.phone);
              return (
                <div key={card.id} className={styles.card}>
                  <h4>{card.title}</h4>
                  {card.detail ? <p className={styles.subText}>{card.detail}</p> : null}
                  {card.phone ? (
                    href ? (
                      <p className={styles.phone}>
                        <a href={href}>{card.phone}</a>
                      </p>
                    ) : (
                      <p className={styles.phone}>{card.phone}</p>
                    )
                  ) : null}
                  <ul>
                    {(card.bullets || []).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
