import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./PasswordField.module.css";

export default function PasswordField({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  minLength,
  disabled,
}) {
  const [show, setShow] = useState(false);

  return (
    <div className={styles.wrap}>
      <input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        disabled={disabled}
      />
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
