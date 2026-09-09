import styles from "./CivicGuide.module.css";

export default function CivicGuide() {
  return (
    <section className={styles.section}>
      <h2>Who to call</h2>
      <p className={styles.lede}>
        The HOA does not handle everything. If it is dangerous right now, call emergency services. If it is a city service, call Piedmont. Use Town Central for association business.
      </p>
      <p className={styles.hint}>
        Exact city numbers and the items this board usually refers out can be filled in as you collect them.
      </p>

      <div className={styles.container}>
        <div className={styles.column}>
          <h3>Emergency</h3>
          <div className={styles.card}>
            <h4>Life, fire, crime in progress</h4>
            <p className={styles.subText}>Call 911</p>
            <ul>
              <li>Medical emergency</li>
              <li>Fire</li>
              <li>Break-in or violence</li>
            </ul>
          </div>
          <div className={styles.card}>
            <h4>Non-emergency police</h4>
            <p className={styles.subText}>Piedmont Police</p>
            <ul>
              <li>Noise after hours</li>
              <li>Suspicious activity that is not in progress</li>
            </ul>
          </div>
        </div>

        <div className={styles.column}>
          <h3>City of Piedmont</h3>
          <div className={styles.card}>
            <h4>Code enforcement</h4>
            <p className={styles.subText}>City Hall</p>
            <ul>
              <li>Tall grass on a private lot the city covers</li>
              <li>Illegal parking on a public street</li>
            </ul>
          </div>
          <div className={styles.card}>
            <h4>Utilities &amp; public works</h4>
            <p className={styles.subText}>Public Works</p>
            <ul>
              <li>Water main / meter issues</li>
              <li>City trash pickup</li>
              <li>Street lights on a public street</li>
            </ul>
          </div>
        </div>

        <div className={styles.column}>
          <h3>Town Central HOA</h3>
          <div className={styles.card}>
            <h4>Change to a house</h4>
            <p className={styles.subText}>Submit a request</p>
            <ul>
              <li>Fence, paint, addition</li>
              <li>Anything that changes the view from the street</li>
            </ul>
          </div>
          <div className={styles.card}>
            <h4>Common areas &amp; dues</h4>
            <p className={styles.subText}>Board</p>
            <ul>
              <li>Common-area repair</li>
              <li>Dues questions</li>
              <li>Covenant questions</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
