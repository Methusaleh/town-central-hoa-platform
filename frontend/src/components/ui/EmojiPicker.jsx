import { useMemo, useState } from "react";
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
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GROUPS;
    return GROUPS.map((group) => ({
      ...group,
      glyphs: group.glyphs.filter((g) => g.includes(q) || group.label.toLowerCase().includes(q)),
    })).filter((group) => group.glyphs.length > 0);
  }, [query]);

  return (
    <div className={styles.panel} role="dialog" aria-label="Emoji picker">
      <div className={styles.top}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className={styles.search}
        />
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close picker">
          Close
        </button>
      </div>
      <div className={styles.body}>
        {filtered.map((group) => (
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
