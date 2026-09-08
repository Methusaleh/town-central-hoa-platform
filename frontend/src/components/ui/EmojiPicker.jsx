import styles from "./EmojiPicker.module.css";

const GROUPS = [
  {
    id: "faces",
    label: "Faces",
    glyphs: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🤩", "😘", "😋", "😜", "🤔", "🤨", "😐", "😴", "😢", "😭", "😤", "😡", "🤯", "😳", "🤗", "🫡"],
  },
  {
    id: "gestures",
    label: "Gestures",
    glyphs: ["👍", "👎", "👏", "🙌", "🙏", "💪", "✌️", "🤞", "🤝", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💯", "🔥", "✨", "🎉", "😂"],
  },
  {
    id: "home",
    label: "Neighborhood",
    glyphs: ["🏡", "🌳", "🌸", "🌞", "🌧️", "❄️", "🐶", "🐱", "🐦", "☕", "🍽️", "🎂", "🎈", "🚗", "🛠️", "📦", "📬", "👋"],
  },
];

export default function EmojiPicker({ onPick, onClose }) {
  return (
    <div className={styles.panel} role="dialog" aria-label="Emoji picker">
      <div className={styles.top}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close picker">
          Close
        </button>
      </div>
      <div className={styles.body}>
        {GROUPS.map((group) => (
          <section key={group.id}>
            <p className={styles.groupLabel}>{group.label}</p>
            <div className={styles.grid}>
              {group.glyphs.map((glyph) => (
                <button
                  key={glyph}
                  type="button"
                  className={styles.glyph}
                  onClick={() => onPick(glyph)}
                >
                  {glyph}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
