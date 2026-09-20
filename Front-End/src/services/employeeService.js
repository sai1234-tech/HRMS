import { broadcastDataChange } from "../utils/syncManager";

let mockEmployees = [
  { _id: "e1", firstName: "Aisha", lastName: "Sharma", employment: { status: "Active", department: "Engineering", designation: "Software Engineer" }, email: "aisha@example.com" },
  { _id: "e2", firstName: "Rohan", lastName: "Das", employment: { status: "Active", department: "Finance", designation: "Analyst" }, email: "rohan@example.com" }
];

export async function getEmployee() {
  return new Promise(resolve => {
    setTimeout(() => resolve({ data: mockEmployees[0] }), 400);
  });
}

export async function updateEmployee(data) {
  return new Promise(resolve => {
    setTimeout(() => {
      mockEmployees[0] = { ...mockEmployees[0], ...data };
      resolve({ success: true, data: mockEmployees[0] });
    }, 400);
  });
}

export async function getAllEmployees(search = "") {
  return new Promise(resolve => {
    setTimeout(() => {
      let filtered = mockEmployees;
      if (search) {
        const s = search.toLowerCase();
        filtered = mockEmployees.filter(e => e.firstName.toLowerCase().includes(s) || e.lastName.toLowerCase().includes(s));
      }
      resolve({ data: filtered });
    }, 400);
  });
}

export async function createEmployees(employees) {
  return new Promise(resolve => {
    setTimeout(() => {
      const created = employees.map(e => ({ ...e, _id: "e" + Date.now() }));
      mockEmployees = [...mockEmployees, ...created];
      resolve({ success: true });
    }, 400);
  });
}

export async function updateEmployeeById(id, employee) {
  return new Promise(resolve => {
    setTimeout(() => {
      const idx = mockEmployees.findIndex(e => e._id === id);
      if (idx !== -1) mockEmployees[idx] = { ...mockEmployees[idx], ...employee };
      resolve({ success: true });
    }, 400);
  });
}

export async function deleteEmployeeById(id) {
  return new Promise(resolve => {
    setTimeout(() => {
      mockEmployees = mockEmployees.filter(e => e._id !== id);
      resolve({ success: true });
    }, 400);
  });
}

export async function uploadProfilePicture(file) {
  return new Promise(resolve => {
    setTimeout(() => resolve({ success: true, url: "/mock-profile.png" }), 800);
  });
}