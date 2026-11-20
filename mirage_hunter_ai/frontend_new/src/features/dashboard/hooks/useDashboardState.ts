import { useContext } from "react";

import { DashboardStateContext } from "./dashboardStateContext";

export function useDashboardState() {
  const value = useContext(DashboardStateContext);
  if (!value) throw new Error("useDashboardState phải được dùng trong DashboardStateProvider.");
  return value;
}
