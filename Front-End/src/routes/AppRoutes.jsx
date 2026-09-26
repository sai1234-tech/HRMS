import { Navigate, Route, Routes } from "react-router-dom";

import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";
import AdminSetup from "../pages/auth/AdminSetup";

// Employee pages
import EmployeeDashboard from "../pages/employee/EmployeeDashboard";
import EmployeeAttendance from "../pages/employee/EmployeeAttendance";
import EmployeeLeaves from "../pages/employee/EmployeeLeaves";
import EmployeeTimesheets from "../pages/employee/EmployeeTimesheets";
import EmployeeProfile from "../pages/employee/EmployeeProfile";
import EmployeePayroll from "../pages/employee/EmployeePayroll";
import EmployeeDocuments from "../pages/employee/EmployeeDocuments";
import Performance from "../pages/employee/Performance";

// Manager pages
import ManagerDashboard from "../pages/manager/ManagerDashboard.jsx";
import ManagerProjects from "../pages/manager/ManagerProjects.jsx";

// HR pages
import HRDashboard from "../pages/hr/HRDashboard";
import DepartmentManagement from "../pages/hr/DepartmentManagement";
import EmployeeManagement from "../pages/hr/EmployeeManagement";
import TimesheetManagement from "../pages/hr/TimesheetManagement";
import PayrollManagement from "../pages/hr/PayrollManagement";
import DocumentManagement from "../pages/hr/DocumentManagement";
import RecruitmentOnboarding from "../pages/hr/RecruitmentOnboarding";
import ResourceAllocation from "../pages/hr/ResourceAllocation";
import ShiftRoster from "../pages/hr/ShiftRoster";
import Helpdesk from "../pages/hr/Helpdesk";
import HRPerformance from "../pages/hr/HRPerformance";
import HRLeaveManagement from "../pages/hr/HRLeaveManagement";
import AccountManagement from "../pages/admin/AccountManagement";
import AdminDashboard from "../pages/admin/AdminDashboard";
import OrganizationHierarchy from "../pages/organization/OrganizationHierarchy";

import { useAuth } from "../context/AuthContext";
import InitialLoader from "../components/common/InitialLoader";
import { normalizeRole } from "../utils/auth";
import { SidebarProvider } from "../context/SidebarContext";
import DashboardLayout from "../components/layout/DashboardLayout";

/**
 * Protect routes based on authentication and role.
 */
function ProtectedRoute({ children, roles = [] }) {
  const { user, loading } = useAuth();

  // Auth state is still loading
  if (loading) {
    return <InitialLoader />;
  }

  // User is not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Normalize role before checking
  const userRole = normalizeRole(user);

  // Role is not allowed
  if (roles.length > 0 && !roles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

const ALL_ROLES = ["employee", "manager", "hr", "admin"];

function AppRoutes() {
  return (
    <Routes>

      {/* =========================
          PUBLIC ROUTES
      ========================== */}

      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/signup"
        element={<Signup />}
      />

      <Route
        path="/admin/setup"
        element={<AdminSetup />}
      />


      {/* ===================================================
          AUTHENTICATED APPLICATION SHELL (SIDEBAR + TOPBAR)
      =================================================== */}
      <Route
        element={
          <ProtectedRoute>
            <SidebarProvider>
              <DashboardLayout />
            </SidebarProvider>
          </ProtectedRoute>
        }
      >
        {/* =========================
            EMPLOYEE & SELF-SERVICE ROUTES (All Roles)
        ========================== */}

        <Route
          path="/employee/dashboard"
          element={
            <ProtectedRoute roles={ALL_ROLES}>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employee/attendance"
          element={
            <ProtectedRoute roles={ALL_ROLES}>
              <EmployeeAttendance />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employee/leaves"
          element={
            <ProtectedRoute roles={ALL_ROLES}>
              <EmployeeLeaves />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employee/timesheets"
          element={
            <ProtectedRoute roles={ALL_ROLES}>
              <EmployeeTimesheets />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employee/performance"
          element={
            <ProtectedRoute roles={ALL_ROLES}>
              <Performance />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employee/profile"
          element={
            <ProtectedRoute roles={ALL_ROLES}>
              <EmployeeProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute roles={ALL_ROLES}>
              <EmployeeProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employee/payroll"
          element={
            <ProtectedRoute roles={ALL_ROLES}>
              <EmployeePayroll />
            </ProtectedRoute>
          }
        />

        <Route
          path="/manager/payroll"
          element={
            <ProtectedRoute roles={ALL_ROLES}>
              <EmployeePayroll />
            </ProtectedRoute>
          }
        />

        <Route
          path="/payroll"
          element={
            <ProtectedRoute roles={ALL_ROLES}>
              <EmployeePayroll />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employee/documents"
          element={
            <ProtectedRoute roles={ALL_ROLES}>
              <EmployeeDocuments />
            </ProtectedRoute>
          }
        />

        <Route
          path="/documents"
          element={
            <ProtectedRoute roles={ALL_ROLES}>
              <EmployeeDocuments />
            </ProtectedRoute>
          }
        />


        {/* =========================
            MANAGER ROUTES
        ========================== */}

        <Route
          path="/manager/dashboard"
          element={
            <ProtectedRoute roles={["manager", "admin"]}>
              <ManagerDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/manager/projects"
          element={
            <ProtectedRoute roles={["manager", "admin"]}>
              <ManagerProjects />
            </ProtectedRoute>
          }
        />


        {/* =========================
            ADMIN ROUTES
        ========================== */}

        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/accounts"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AccountManagement />
            </ProtectedRoute>
          }
        />


        {/* =========================
            HR / ADMIN GOVERNANCE ROUTES
        ========================== */}

        <Route
          path="/hr/dashboard"
          element={
            <ProtectedRoute roles={["hr", "admin"]}>
              <HRDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hr/performance"
          element={
            <ProtectedRoute roles={["hr", "admin", "manager"]}>
              <HRPerformance />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hr/departments"
          element={
            <ProtectedRoute roles={["hr", "admin"]}>
              <DepartmentManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hr/employees"
          element={
            <ProtectedRoute roles={["hr", "admin"]}>
              <EmployeeManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hr/timesheets"
          element={
            <ProtectedRoute roles={["hr", "admin"]}>
              <TimesheetManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hr/recruitment"
          element={
            <ProtectedRoute roles={["hr", "admin"]}>
              <RecruitmentOnboarding />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hr/resources"
          element={
            <ProtectedRoute roles={["hr", "admin"]}>
              <ResourceAllocation />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hr/roster"
          element={
            <ProtectedRoute roles={["hr", "admin"]}>
              <ShiftRoster />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hr/payroll"
          element={
            <ProtectedRoute roles={["hr", "admin", "manager"]}>
              <PayrollManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/hr/helpdesk"
          element={
            <ProtectedRoute roles={["hr", "admin"]}>
              <Helpdesk />
            </ProtectedRoute>
          }
        />

        <Route path="/hr/leaves" element={<ProtectedRoute roles={["hr", "admin"]}><HRLeaveManagement /></ProtectedRoute>} />
        <Route path="/hr/documents" element={<ProtectedRoute roles={["hr", "admin"]}><DocumentManagement /></ProtectedRoute>} />
        <Route path="/hr/organization" element={<ProtectedRoute roles={ALL_ROLES}><OrganizationHierarchy /></ProtectedRoute>} />
        <Route path="/organization" element={<ProtectedRoute roles={ALL_ROLES}><OrganizationHierarchy /></ProtectedRoute>} />
        <Route path="/employee/organization" element={<ProtectedRoute roles={ALL_ROLES}><OrganizationHierarchy /></ProtectedRoute>} />
      </Route>

      {/* =========================
          UNAUTHORIZED
      ========================== */}

      <Route
        path="/unauthorized"
        element={
          <main style={{ padding: "30px", textAlign: "center" }}>
            <h1 style={{ color: "#e11d48" }}>Access Denied</h1>
            <p style={{ color: "#64748b" }}>
              You do not have permission to access this page.
            </p>
          </main>
        }
      />


      {/* =========================
          FALLBACK
      ========================== */}

      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />

    </Routes>
  );
}

export default AppRoutes;