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
  Waves,
} from "lucide-react";

export const PATHS = {
  home: "/dashboard",
  porch: "/dashboard/porch",
  events: "/dashboard/events",
  announcements: "/dashboard/announcements",
  alerts: "/dashboard/alerts",
  documents: "/dashboard/documents",
  maintenance: "/dashboard/maintenance",
  requests: "/dashboard/requests",
  dues: "/dashboard/dues",
  vendors: "/dashboard/vendors",
  contact: "/dashboard/contact",
  amenities: "/dashboard/amenities",
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
  { to: PATHS.porch, label: "The Porch", icon: MessagesSquare },
  { to: PATHS.events, label: "Events", icon: CalendarDays },
  { to: PATHS.documents, label: "Docs", icon: FolderOpen },
];

export const moreItems = [
  { to: PATHS.announcements, label: "Announcements", icon: Megaphone },
  { to: PATHS.alerts, label: "Alerts", icon: Bell },
  { to: PATHS.requests, label: "Requests", icon: ClipboardList },
  { to: PATHS.dues, label: "My Dues", icon: Wallet },
  { to: PATHS.vendors, label: "Trusted Companies", icon: Building2 },
  { to: PATHS.amenities, label: "Pool & clubhouse", icon: Waves },
  { to: PATHS.contact, label: "Contact the Board", icon: Mail },
];

export const mobileTabs = [
  { to: PATHS.home, label: "Home", icon: Home, end: true },
  { to: PATHS.porch, label: "The Porch", icon: MessagesSquare },
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
