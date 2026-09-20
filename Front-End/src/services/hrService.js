import { broadcastDataChange } from "../utils/syncManager";

// Mock Data Storage
let mockEmployees = [
  { _id: "e1", firstName: "Aisha", lastName: "Sharma", employment: { status: "Active", department: "Engineering" }, email: "aisha@example.com" },
  { _id: "e2", firstName: "Rohan", lastName: "Das", employment: { status: "Active", department: "Finance" }, email: "rohan@example.com" }
];

let mockAttendance = [
  { _id: "a1", employee: "e1", date: new Date().toISOString(), status: "present" },
  { _id: "a2", employee: "e2", date: new Date().toISOString(), status: "late" }
];

let mockLeaves = [
  { _id: "L1", employeeName: "Aisha Sharma", type: "Sick Leave", status: "Pending", startDate: "2026-10-01", endDate: "2026-10-02", reason: "Fever" }
];

export async function getEmployees(search = "") {
  return new Promise(resolve => {
    setTimeout(() => {
      let filtered = mockEmployees;
      if (search) {
        const s = search.toLowerCase();
        filtered = mockEmployees.filter(e => e.firstName.toLowerCase().includes(s) || e.lastName.toLowerCase().includes(s));
      }
      resolve({ employees: filtered });
    }, 400);
  });
}

export async function getAllAttendance() {
  return new Promise(resolve => {
    setTimeout(() => resolve({ records: mockAttendance }), 400);
  });
}

export async function getMonthlyAttendanceReport(year, month) {
  return new Promise(resolve => {
    setTimeout(() => resolve({ records: mockAttendance }), 400);
  });
}

export async function getAttendanceSummary() {
  return new Promise(resolve => {
    setTimeout(() => resolve({ summary: { present: 2, absent: 0, late: 1 } }), 400);
  });
}

export async function getAllLeaves() {
  return new Promise(resolve => {
    setTimeout(() => resolve({ data: mockLeaves }), 400);
  });
}

export async function getLeaveTypes() {
  return new Promise(resolve => {
    setTimeout(() => resolve({ data: ["Annual Leave", "Sick Leave", "Unpaid Leave"] }), 400);
  });
}

export async function approveLeave(leaveId) {
  return new Promise(resolve => {
    setTimeout(() => {
      const idx = mockLeaves.findIndex(l => l._id === leaveId);
      if (idx !== -1) mockLeaves[idx].status = "Approved";
      resolve({ success: true });
    }, 400);
  });
}

export async function rejectLeave(leaveId, rejectionReason) {
  return new Promise(resolve => {
    setTimeout(() => {
      const idx = mockLeaves.findIndex(l => l._id === leaveId);
      if (idx !== -1) {
        mockLeaves[idx].status = "Rejected";
        mockLeaves[idx].rejectionReason = rejectionReason;
      }
      resolve({ success: true });
    }, 400);
  });
}

export async function revertLeave(leaveId) {
  return new Promise(resolve => {
    setTimeout(() => {
      const idx = mockLeaves.findIndex(l => l._id === leaveId);
      if (idx !== -1) mockLeaves[idx].status = "Pending";
      resolve({ success: true });
    }, 400);
  });
}
