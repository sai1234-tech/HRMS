import { WORKFORCE_DIRECTORY } from "./workforceDirectory";

export function getDemoFallbackSession(email = "") {
  const cleanEmail = (email || "").trim().toLowerCase();

  if (cleanEmail.includes("admin")) {
    return {
      token: `demo-token-admin-${Date.now()}`,
      user: {
        _id: "demo-admin-id",
        name: "System Administrator",
        email: "admin@hrms.com",
        role: "admin",
        isDemo: true,
      },
      employee: {
        _id: "emp-ceo",
        employeeCode: "QSI-001",
        firstName: "System",
        lastName: "Administrator",
        name: "System Administrator",
        email: "admin@hrms.com",
        phone: "+91 98201 11001",
        employment: {
          department: "Executive Leadership",
          designation: "Chief Administrator",
          status: "Active",
          employmentType: "Full Time Permanent",
          joiningDate: "2020-01-01",
        },
      },
    };
  }

  if (cleanEmail.includes("hr")) {
    return {
      token: `demo-token-hr-${Date.now()}`,
      user: {
        _id: "demo-hr-id",
        name: "Priya Nair",
        email: "hr@hrms.com",
        role: "hr",
        isDemo: true,
      },
      employee: {
        _id: "emp-hr-lead",
        employeeCode: "QSI-006",
        firstName: "Priya",
        lastName: "Nair",
        name: "Priya Nair",
        email: "hr@hrms.com",
        phone: "+91 98201 11006",
        employment: {
          department: "Human Resources",
          designation: "HR Manager",
          status: "Active",
          employmentType: "Full Time Permanent",
          joiningDate: "2021-02-15",
        },
      },
    };
  }

  // Default to Employee
  return {
    token: `demo-token-employee-${Date.now()}`,
    user: {
      _id: "demo-emp-id",
      name: "Kavita Rao",
      email: cleanEmail || "employee@hrms.com",
      role: "employee",
      isDemo: true,
    },
    employee: {
      _id: "emp-fe-lead",
      employeeCode: "QSI-004",
      firstName: "Kavita",
      lastName: "Rao",
      name: "Kavita Rao",
      email: cleanEmail || "employee@hrms.com",
      phone: "+91 98201 11004",
      employment: {
        department: "Engineering",
        designation: "Senior Frontend Engineer",
        status: "Active",
        employmentType: "Full Time Permanent",
        joiningDate: "2022-03-01",
      },
    },
  };
}

export function handleDemoApi(endpoint, options = {}) {
  const norm = endpoint.toLowerCase();
  const method = (options.method || "GET").toUpperCase();

  console.info(`[Demo Mode API] Handled ${method} ${endpoint}`);

  if (norm.includes("/auth/admin-summary")) {
    return {
      success: true,
      data: {
        totalEmployees: 16,
        activeEmployees: 15,
        onLeaveToday: 1,
        pendingTimesheets: 3,
        totalDepartments: 5,
        activeProjects: 8,
        monthlyPayroll: 1845000,
        systemStatus: "Healthy (Demo Mode)",
        recentAudits: [
          { id: "aud-1", action: "Timesheet Approved", user: "Priya Nair", timestamp: new Date().toISOString() },
          { id: "aud-2", action: "Employee Profile Updated", user: "Kavita Rao", timestamp: new Date().toISOString() },
          { id: "aud-3", action: "Leave Request Approved", user: "Rahul Sharma", timestamp: new Date().toISOString() },
        ],
      },
    };
  }

  if (norm.includes("/auth/me")) {
    const userStr = sessionStorage.getItem("hrms_user");
    const empStr = sessionStorage.getItem("hrms_employee");
    const user = userStr ? JSON.parse(userStr) : getDemoFallbackSession().user;
    const employee = empStr ? JSON.parse(empStr) : getDemoFallbackSession().employee;
    return {
      success: true,
      data: { user, employee },
    };
  }

  if (norm.includes("/employee") || norm.includes("/workforce")) {
    const formatted = WORKFORCE_DIRECTORY.map((emp) => ({
      _id: emp.id,
      id: emp.id,
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      employment: {
        department: emp.department,
        designation: emp.designation,
        status: emp.status,
        employmentType: emp.employmentType,
        joiningDate: emp.dateOfJoining,
      },
    }));

    return {
      success: true,
      data: formatted,
      employees: formatted,
    };
  }

  if (norm.includes("/department")) {
    return {
      success: true,
      data: [
        { _id: "d1", name: "Engineering", code: "ENG", headCount: 6, manager: "Dr. Sanjay Verma" },
        { _id: "d2", name: "Product & Design", code: "PRD", headCount: 3, manager: "Meera Krishnan" },
        { _id: "d3", name: "Human Resources", code: "HR", headCount: 2, manager: "Priya Nair" },
        { _id: "d4", name: "Finance & Accounts", code: "FIN", headCount: 2, manager: "Rajesh Iyer" },
        { _id: "d5", name: "Executive Leadership", code: "EXE", headCount: 3, manager: "Dr. Arvind Swaminathan" },
      ],
    };
  }

  if (norm.includes("/attendance")) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      success: true,
      data: [
        { _id: "att-1", date: today, punchIn: "09:05 AM", punchOut: null, status: "Present", workHours: 4.8 },
        { _id: "att-2", date: "2026-09-21", punchIn: "09:00 AM", punchOut: "06:00 PM", status: "Present", workHours: 8.5 },
        { _id: "att-3", date: "2026-09-20", punchIn: "09:12 AM", punchOut: "06:15 PM", status: "Present", workHours: 8.2 },
        { _id: "att-4", date: "2026-09-19", punchIn: "08:55 AM", punchOut: "05:58 PM", status: "Present", workHours: 8.1 },
      ],
    };
  }

  if (norm.includes("/timesheet")) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      success: true,
      data: {
        entries: [
          { id: "ts-1", date: today, hours: 8, project: "HRMS Enterprise Portal", task: "Demo Mode Testing", status: "submitted" },
          { id: "ts-2", date: "2026-09-21", hours: 8, project: "HRMS Enterprise Portal", task: "Core UI Flow", status: "approved" },
          { id: "ts-3", date: "2026-09-20", hours: 8, project: "Platform Architecture", task: "Vite and Netlify Deployment", status: "approved" },
        ],
        status: "submitted",
        totalHours: 40,
      },
    };
  }

  if (norm.includes("/leave")) {
    return {
      success: true,
      data: {
        balances: { casual: 8, sick: 10, paid: 15 },
        requests: [
          { id: "lv-1", type: "Casual Leave", fromDate: "2026-09-28", toDate: "2026-09-29", status: "Approved", reason: "Family event" },
        ],
      },
    };
  }

  if (norm.includes("/payroll")) {
    return {
      success: true,
      data: {
        month: "September 2026",
        basicPay: 95000,
        hra: 38000,
        allowances: 15000,
        deductions: 12000,
        netPay: 136000,
        status: "Processed",
      },
    };
  }

  // Fallback for any other endpoint
  return {
    success: true,
    data: {},
    message: "Action simulated successfully in Demo Mode",
  };
}
