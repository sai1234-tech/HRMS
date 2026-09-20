import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";
import CommandPalette from "../common/CommandPalette";
import { useSidebar } from "../../context/SidebarContext";
import "./DashboardLayout.css";

function DashboardLayout() {
  const { isCollapsed } = useSidebar();

  return (
    <div className={`hrms-dashboard-shell ${isCollapsed ? "sidebar-collapsed" : "sidebar-expanded"}`}>
      <AppSidebar />
      <div className="hrms-main-viewport">
        <Outlet />
      </div>
      <CommandPalette />
    </div>
  );
}

export default DashboardLayout;
