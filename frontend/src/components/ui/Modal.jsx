import styles from "./Modal.module.css";

export default function Modal({ title, description, onClose, children, wide }) {
  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={`${styles.card} ${wide ? styles.wide : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "tc-modal-title" : undefined}
      >
        {title && (
          <header className={styles.header}>
            <div>
              <h3 id="tc-modal-title">{title}</h3>
              {description && <p>{description}</p>}
            </div>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
              ×
            </button>
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
