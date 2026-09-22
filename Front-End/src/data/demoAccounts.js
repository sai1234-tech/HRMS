import { WORKFORCE_DIRECTORY } from "./workforceDirectory";

// Dictionary of verified accounts & registered team members
const KNOWN_ACCOUNTS = {
  "narsimhakushangala@gmail.com": {
    firstName: "Narsimha",
    lastName: "Kushangala",
    department: "Engineering",
    designation: "Software Engineer",
    role: "employee",
  },
  "simhavahiniganesh@gmail.com": {
    firstName: "Simhavahini",
    lastName: "Ganesh",
    department: "Operations",
    designation: "Operations Specialist",
    role: "employee",
  },
  "saikirankushangala@gmail.com": {
    firstName: "SaiKiran",
    lastName: "Kushangala",
    department: "Engineering",
    designation: "Full Stack Engineer",
    role: "employee",
  },
  "kirankushangala@gmail.com": {
    firstName: "Sai Kiran",
    lastName: "Kushangala",
    department: "Engineering",
    designation: "Software Engineer",
    role: "employee",
  },
  "admin@hrms.com": {
    firstName: "System",
    lastName: "Administrator",
    department: "Executive Leadership",
    designation: "Chief Administrator",
    role: "admin",
  },
  "hr@hrms.com": {
    firstName: "Priya",
    lastName: "Nair",
    department: "Human Resources",
    designation: "HR Manager",
    role: "hr",
  },
  "employee@hrms.com": {
    firstName: "Demo",
    lastName: "Employee",
    department: "Engineering",
    designation: "Frontend Engineer",
    role: "employee",
  },
};

function capitalize(str = "") {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function deriveNameFromEmail(email = "") {
  if (!email) return { firstName: "Employee", lastName: "" };
  const localPart = email.split("@")[0] || "";

  // If camelCase (e.g. simhavahiniGanesh)
  const splitCamel = localPart.replace(/([a-z])([A-Z])/g, "$1 $2");
  if (splitCamel.includes(" ")) {
    const parts = splitCamel.split(" ").filter(Boolean);
    return {
      firstName: capitalize(parts[0]),
      lastName: parts.slice(1).map(capitalize).join(" "),
    };
  }

  // If separated by dot, hyphen, or underscore
  if (/[._-]/.test(localPart)) {
    const parts = localPart.split(/[._-]+/).filter(Boolean);
    return {
      firstName: capitalize(parts[0]),
      lastName: parts.slice(1).map(capitalize).join(" "),
    };
  }

  // Fallback for single continuous string (e.g. narsimhakushangala)
  return {
    firstName: capitalize(localPart),
    lastName: "",
  };
}

export function getDemoFallbackSession(email = "") {
  const cleanEmail = (email || "").trim().toLowerCase();
  const known = KNOWN_ACCOUNTS[cleanEmail];

  let firstName = "";
  let lastName = "";
  let role = "employee";
  let department = "Engineering";
  let designation = "Software Engineer";

  if (known) {
    firstName = known.firstName;
    lastName = known.lastName;
    role = known.role || "employee";
    department = known.department;
    designation = known.designation;
  } else if (cleanEmail.includes("admin")) {
    firstName = "System";
    lastName = "Administrator";
    role = "admin";
    department = "Executive Leadership";
    designation = "System Administrator";
  } else if (cleanEmail.includes("hr")) {
    firstName = "HR";
    lastName = "Manager";
    role = "hr";
    department = "Human Resources";
    designation = "HR Manager";
  } else {
    const derived = deriveNameFromEmail(cleanEmail);
    firstName = derived.firstName;
    lastName = derived.lastName;
    role = "employee";
  }

  const fullName = `${firstName} ${lastName}`.trim();
  const employeeCode = `EMP-${Math.abs(cleanEmail.split("").reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0) % 9000 + 1000)}`;

  return {
    token: `demo-token-${role}-${Date.now()}`,
    user: {
      _id: `user-${cleanEmail.replace(/[^a-z0-9]/g, "")}`,
      name: fullName,
      email: cleanEmail || "employee@hrms.com",
      role: role,
      isDemo: true,
    },
    employee: {
      _id: `emp-${cleanEmail.replace(/[^a-z0-9]/g, "")}`,
      employeeCode: employeeCode,
      firstName: firstName,
      lastName: lastName,
      name: fullName,
      email: cleanEmail || "employee@hrms.com",
      phone: "+91 98000 00000",
      employment: {
        department: department,
        designation: designation,
        status: "Active",
        employmentType: "Full Time Permanent",
        joiningDate: "2023-01-15",
      },
    },
  };
}

export function handleDemoApi(endpoint, options = {}) {
  const norm = endpoint.toLowerCase();
  const method = (options.method || "GET").toUpperCase();

  console.info(`[Demo Mode API] Handled ${method} ${endpoint}`);

  // Current session user / employee resolution (CRITICAL: Must return the logged-in user, not random)
  if (norm.includes("/employee/me") || norm.includes("/auth/me")) {
    const userStr = sessionStorage.getItem("hrms_user");
    const empStr = sessionStorage.getItem("hrms_employee");
    const user = userStr ? JSON.parse(userStr) : null;
    const employee = empStr ? JSON.parse(empStr) : user;

    return {
      success: true,
      data: employee || user,
      employee: employee || user,
      user: user,
    };
  }

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
          { id: "aud-1", action: "Timesheet Approved", user: "HR Team", timestamp: new Date().toISOString() },
          { id: "aud-2", action: "Profile Updated", user: "Self Service", timestamp: new Date().toISOString() },
          { id: "aud-3", action: "Leave Request Approved", user: "Manager", timestamp: new Date().toISOString() },
        ],
      },
    };
  }

  // Directory list (only when querying collection of employees, NOT /employee/me)
  if (norm.includes("/employees") || norm.includes("/workforce") || norm === "/employee" || norm === "/api/v1/employee") {
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

  // Interactive Clock In handling
  if (norm.includes("/attendance/check-in")) {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const existingStr = localStorage.getItem("hrms_demo_attendance");
    let history = existingStr ? JSON.parse(existingStr) : [];

    let todayRecord = history.find((r) => (r.date || "").startsWith(today));
    if (!todayRecord) {
      todayRecord = {
        _id: `att-demo-${Date.now()}`,
        id: `att-demo-${Date.now()}`,
        date: today,
        checkIn: now.toISOString(),
        checkOut: null,
        status: "Present",
        workingHours: 0,
      };
      history.unshift(todayRecord);
    } else if (!todayRecord.checkIn) {
      todayRecord.checkIn = now.toISOString();
    }

    localStorage.setItem("hrms_demo_attendance", JSON.stringify(history));
    window.dispatchEvent(new CustomEvent("hrms:data_changed"));

    return {
      success: true,
      message: "Check-in successful",
      data: {
        attendance: todayRecord,
      },
    };
  }

  // Interactive Clock Out handling
  if (norm.includes("/attendance/check-out")) {
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const existingStr = localStorage.getItem("hrms_demo_attendance");
    let history = existingStr ? JSON.parse(existingStr) : [];

    let todayRecord = history.find((r) => (r.date || "").startsWith(today));
    if (todayRecord) {
      todayRecord.checkOut = now.toISOString();
      const inTime = new Date(todayRecord.checkIn).getTime();
      const outTime = now.getTime();
      const diffHours = Math.max(0.1, Number(((outTime - inTime) / (1000 * 60 * 60)).toFixed(2)));
      todayRecord.workingHours = diffHours;
      todayRecord.status = "Completed";
    }

    localStorage.setItem("hrms_demo_attendance", JSON.stringify(history));
    window.dispatchEvent(new CustomEvent("hrms:data_changed"));

    return {
      success: true,
      message: "Check-out successful",
      data: {
        attendance: todayRecord,
      },
    };
  }

  // Today's attendance query
  if (norm.includes("/attendance/today")) {
    const today = new Date().toISOString().slice(0, 10);
    const existingStr = localStorage.getItem("hrms_demo_attendance");
    const history = existingStr ? JSON.parse(existingStr) : [];
    const todayRecord = history.find((r) => (r.date || "").startsWith(today));

    if (todayRecord && todayRecord.checkIn) {
      return {
        success: true,
        data: {
          attendance: todayRecord,
        },
        attendance: todayRecord,
      };
    }

    return {
      success: true,
      data: null,
      message: "No attendance found for today",
    };
  }

  // History & ledger query
  if (norm.includes("/attendance")) {
    const existingStr = localStorage.getItem("hrms_demo_attendance");
    let history = existingStr ? JSON.parse(existingStr) : [];

    if (history.length === 0) {
      history = [
        { _id: "att-hist-1", id: "att-hist-1", date: "2026-09-21", checkIn: "2026-09-21T09:00:00.000Z", checkOut: "2026-09-21T18:00:00.000Z", status: "Present", workingHours: 8.5 },
        { _id: "att-hist-2", id: "att-hist-2", date: "2026-09-20", checkIn: "2026-09-20T09:12:00.000Z", checkOut: "2026-09-20T18:15:00.000Z", status: "Present", workingHours: 8.2 },
        { _id: "att-hist-3", id: "att-hist-3", date: "2026-09-19", checkIn: "2026-09-19T08:58:00.000Z", checkOut: "2026-09-19T18:05:00.000Z", status: "Present", workingHours: 8.1 },
      ];
      localStorage.setItem("hrms_demo_attendance", JSON.stringify(history));
    }

    return {
      success: true,
      data: history,
      records: history,
    };
  }

  if (norm.includes("/timesheet")) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      success: true,
      data: {
        entries: [
          { id: "ts-1", date: today, hours: 8, project: "HRMS Enterprise Portal", task: "Feature testing & review", status: "submitted" },
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
          { id: "lv-1", type: "Casual Leave", fromDate: "2026-09-28", toDate: "2026-09-29", status: "Approved", reason: "Personal work" },
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

  if (norm.includes("/document")) {
    return {
      success: true,
      data: [],
      documents: [],
    };
  }

  // Fallback for any other endpoint
  return {
    success: true,
    data: {},
    message: "Action simulated successfully in Demo Mode",
  };
}
