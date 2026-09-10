import { useNavigate } from "react-router-dom";
import { Building2, ClipboardList, FolderOpen, Users, Wallet } from "lucide-react";
import { adminToolPaths } from "../../../layout/navConfig";
import TrashSchedule from "./TrashSchedule";
import styles from "./MissionControl.module.css";

const TOOLS = [
  {
    id: "requests",
    label: "Operations & tickets",
    hint: "Open neighbor requests.",
    icon: ClipboardList,
    tone: "warn",
  },
  {
    id: "roster",
    label: "Master roster",
    hint: "Households, claims, and mailings.",
    icon: Users,
    tone: "brand",
  },
  {
    id: "financials",
    label: "Assessment ledger",
    hint: "Balances, checks, and charges.",
    icon: Wallet,
    tone: "accent",
  },
  {
    id: "admin-vendors",
    label: "Vendor controls",
    hint: "Who neighbors can hire.",
    icon: Building2,
    tone: "slate",
  },
  {
    id: "admin-documents",
    label: "Document manager",
    hint: "Neighbor files and board-only files.",
    icon: FolderOpen,
    tone: "leaf",
  },
];

export default function MissionControl() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <p className={styles.kicker}>Board</p>
        <h2>Admin tools</h2>
        <p>Roster, dues, tickets, vendors, and files — board only.</p>
      </header>

      <div className={styles.grid}>
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              type="button"
              className={`${styles.card} ${styles[tool.tone]}`}
              onClick={() => navigate(adminToolPaths[tool.id])}
            >
              <Icon size={112} strokeWidth={1.25} className={styles.watermark} aria-hidden="true" />
              <span className={styles.iconWrap}>
                <Icon size={18} strokeWidth={2} />
              </span>
              <strong>{tool.label}</strong>
              <span>{tool.hint}</span>
            </button>
          );
        })}
      </div>

      <TrashSchedule />
    </div>
  );
}
