import styles from "./CivicGuide.module.css";

export default function CivicGuide() {
  const cityContacts = [
    {
      service: "Code Enforcement",
      contact: "Piedmont City Hall",
      items: ["Tall Grass", "Noise", "Illegal Parking"],
    },
    {
      service: "Utilities",
      contact: "Public Works",
      items: ["Water Leaks", "Trash Pickup", "Street Lights"],
    },
  ];

  const hoaContacts = [
    {
      service: "Architectural",
      contact: "Board Review",
      items: ["Fences", "Paint Colors", "Pools"],
    },
    {
      service: "Community",
      contact: "HOA Manager",
      items: ["Dues", "Common Areas", "Violations"],
    },
  ];

  return (
    <section className={styles.section}>
      <h2>Who to Contact?</h2>
      <div className={styles.container}>
        <div className={styles.column}>
          <h3>City of Piedmont</h3>
          {cityContacts.map((c, i) => (
            <div key={i} className={styles.card}>
              <h4>{c.service}</h4>
              <p className={styles.subText}>{c.contact}</p>
              <ul>
                {c.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={styles.column}>
          <h3>Town Central HOA</h3>
          {hoaContacts.map((c, i) => (
            <div key={i} className={styles.card}>
              <h4>{c.service}</h4>
              <p className={styles.subText}>{c.contact}</p>
              <ul>
                {c.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
