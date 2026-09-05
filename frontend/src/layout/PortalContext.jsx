import { createContext, useContext, useMemo } from "react";

const PortalContext = createContext(null);

export function PortalProvider({ user, onLogout, onUserUpdate, children }) {
  const isBoard = user?.role === "board_member" || user?.role === "super_admin";

  const value = useMemo(
    () => ({
      user,
      isBoard,
      onLogout,
      onUserUpdate,
    }),
    [user, isBoard, onLogout, onUserUpdate],
  );

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal must be used inside PortalProvider");
  return ctx;
}
