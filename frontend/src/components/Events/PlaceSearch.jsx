import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createSessionToken, fetchPlacePredictions } from "./places";
import styles from "./PlaceSearch.module.css";

export default function PlaceSearch({ value, onChange, placeholder }) {
  const listId = useId();
  const inputRef = useRef(null);
  const tokenRef = useRef(null);
  const pickedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(0);
  const [menuBox, setMenuBox] = useState(null);

  useEffect(() => {
    createSessionToken().then((token) => {
      tokenRef.current = token;
    });
  }, []);

  useEffect(() => {
    if (pickedRef.current) {
      pickedRef.current = false;
      setItems([]);
      setOpen(false);
      return undefined;
    }
    const q = String(value || "").trim();
    if (q.length < 2) {
      setItems([]);
      setOpen(false);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const next = await fetchPlacePredictions(q, tokenRef.current);
      if (cancelled) return;
      setItems(next);
      setActive(0);
      setOpen(next.length > 0);
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const el = inputRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setMenuBox({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, items.length]);

  const pick = (item) => {
    pickedRef.current = true;
    onChange(item.description, { placeId: item.placeId });
    setOpen(false);
    setItems([]);
    createSessionToken().then((token) => {
      tokenRef.current = token;
    });
  };

  const onKeyDown = (e) => {
    if (!open || items.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(items[active] || items[0]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <input
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && items[active] ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (items.length) setOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={onKeyDown}
      />
      {open && items.length > 0 && menuBox &&
        createPortal(
          <ul
            id={listId}
            role="listbox"
            className={styles.menu}
            style={{ top: menuBox.top, left: menuBox.left, width: menuBox.width }}
          >
            {items.map((item, index) => (
              <li key={item.placeId} role="presentation">
                <button
                  type="button"
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  className={`${styles.option} ${index === active ? styles.optionOn : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => pick(item)}
                >
                  <strong>{item.label}</strong>
                  {item.secondary ? <span>{item.secondary}</span> : null}
                </button>
              </li>
            ))}
            <li className={styles.credit}>Powered by Google</li>
          </ul>,
          document.body,
        )}
    </div>
  );
}
