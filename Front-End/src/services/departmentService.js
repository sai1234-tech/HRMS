import { broadcastDataChange } from "../utils/syncManager";

// Mock Database for Departments (since backend is inaccessible)
let mockDepartments = [
  {
    _id: "d1",
    departmentCode: "ENG",
    departmentName: "Engineering",
    description: "Core software development and IT infrastructure.",
    managerName: "Sarah Jenkins",
    managerEmail: "sarah.jenkins@example.com",
    location: "Bangalore",
    status: "Active",
  },
  {
    _id: "d2",
    departmentCode: "HR",
    departmentName: "Human Resources",
    description: "Talent acquisition, payroll, and employee relations.",
    managerName: "Michael Chen",
    managerEmail: "michael.chen@example.com",
    location: "Mumbai",
    status: "Active",
  },
  {
    _id: "d3",
    departmentCode: "FIN",
    departmentName: "Finance",
    description: "Accounting, budget planning, and financial audits.",
    managerName: "David O'Brian",
    managerEmail: "david.obrian@example.com",
    location: "Delhi",
    status: "Active",
  },
];

export async function getDepartments(search = "") {
  return new Promise((resolve) => {
    setTimeout(() => {
      let filtered = mockDepartments;
      if (search) {
        const s = search.toLowerCase();
        filtered = mockDepartments.filter(d => 
          d.departmentName.toLowerCase().includes(s) || 
          d.departmentCode.toLowerCase().includes(s)
        );
      }
      resolve({ departments: filtered });
    }, 400); // mock network delay
  });
}

export async function createDepartments(departments) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const created = departments.map(d => ({
        ...d,
        _id: "d" + Date.now() + Math.random().toString(36).substr(2, 5)
      }));
      mockDepartments = [...mockDepartments, ...created];
      broadcastDataChange("/departments", { method: "POST", timestamp: Date.now() });
      resolve({ success: true, count: created.length });
    }, 500);
  });
}

export async function updateDepartment(id, department) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockDepartments.findIndex(d => d._id === id);
      if (index === -1) {
        reject(new Error("Department not found."));
        return;
      }
      mockDepartments[index] = { ...mockDepartments[index], ...department };
      broadcastDataChange("/departments", { method: "PUT", timestamp: Date.now() });
      resolve({ success: true, department: mockDepartments[index] });
    }, 500);
  });
}

export async function deleteDepartment(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const index = mockDepartments.findIndex(d => d._id === id);
      if (index === -1) {
        reject(new Error("Department not found."));
        return;
      }
      mockDepartments.splice(index, 1);
      broadcastDataChange("/departments", { method: "DELETE", timestamp: Date.now() });
      resolve({ success: true });
    }, 500);
  });
}
