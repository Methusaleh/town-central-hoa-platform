import {
  Bell,
  CalendarDays,
  ClipboardList,
  FolderOpen,
  Home,
  MessagesSquare,
  MoreHorizontal,
  Shield,
  Wallet,
  Building2,
  Megaphone,
  Mail,
} from "lucide-react";

export const PATHS = {
  home: "/dashboard",
  porch: "/dashboard/porch",
  events: "/dashboard/events",
  announcements: "/dashboard/announcements",
  alerts: "/dashboard/alerts",
  documents: "/dashboard/documents",
  maintenance: "/dashboard/maintenance",
  dues: "/dashboard/dues",
  vendors: "/dashboard/vendors",
  admin: "/dashboard/admin",
  profile: "/profile",
};

export const FEED_PATHS = {
  [PATHS.announcements]: "announcements",
  [PATHS.alerts]: "alerts",
  [PATHS.porch]: "porch",
};

export const HOME_OPEN_PATHS = {
  events: PATHS.events,
  announcements: PATHS.announcements,
  alerts: PATHS.alerts,
  porch: PATHS.porch,
};

export const desktopPrimary = [
  { to: PATHS.home, label: "Home", icon: Home, end: true },
  { to: PATHS.porch, label: "Porch", icon: MessagesSquare },
  { to: PATHS.events, label: "Events", icon: CalendarDays },
  { to: PATHS.documents, label: "Docs", icon: FolderOpen },
];

export const moreItems = [
  { to: PATHS.announcements, label: "Announcements", icon: Megaphone },
  { to: PATHS.alerts, label: "Alerts", icon: Bell },
  { to: PATHS.maintenance, label: "Maintenance & ARC", icon: ClipboardList },
  { to: PATHS.dues, label: "My Dues", icon: Wallet },
  { to: PATHS.vendors, label: "Trusted Companies", icon: Building2 },
  { action: "contact", label: "Contact the Board", icon: Mail },
];

export const mobileTabs = [
  { to: PATHS.home, label: "Home", icon: Home, end: true },
  { to: PATHS.porch, label: "Porch", icon: MessagesSquare },
  { to: PATHS.events, label: "Events", icon: CalendarDays },
  { to: PATHS.documents, label: "Docs", icon: FolderOpen },
  { action: "more", label: "More", icon: MoreHorizontal },
];

export const adminItem = { to: PATHS.admin, label: "Admin", icon: Shield };

export const adminToolPaths = {
  requests: "/dashboard/admin/requests",
  roster: "/dashboard/admin/roster",
  financials: "/dashboard/admin/financials",
  "admin-vendors": "/dashboard/admin/vendors",
  "admin-documents": "/dashboard/admin/documents",
};
