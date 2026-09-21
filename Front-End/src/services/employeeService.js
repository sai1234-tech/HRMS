import { apiRequest } from "./apiClient";
import { broadcastDataChange } from "../utils/syncManager";

let mockEmployees = [
  { _id: "e1", firstName: "Aisha", lastName: "Sharma", employment: { status: "Active", department: "Engineering", designation: "Software Engineer" }, email: "aisha@example.com" },
  { _id: "e2", firstName: "Rohan", lastName: "Das", employment: { status: "Active", department: "Finance", designation: "Analyst" }, email: "rohan@example.com" }
];

export async function getEmployee() {
  try {
    const res = await apiRequest("/employee/me");
    return {
      success: true,
      data: res.employee || res.user,
      employee: res.employee,
      user: res.user,
    };
  } catch (err) {
    try {
      const authRes = await apiRequest("/auth/me");
      return {
        success: true,
        data: authRes.employee || authRes.user,
        employee: authRes.employee,
        user: authRes.user,
      };
    } catch (authErr) {
      return {
        success: false,
        data: mockEmployees[0],
        employee: mockEmployees[0],
      };
    }
  }
}

export async function updateMyProfile(profileData) {
  try {
    const res = await apiRequest("/employee/me", {
      method: "PUT",
      body: JSON.stringify(profileData),
    });
    return res;
  } catch (err) {
    throw err;
  }
}

export async function updateEmployee(data) {
  try {
    const res = await apiRequest("/employee/me", {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return res;
  } catch (err) {
    throw err;
  }
}

export async function getAllEmployees(search = "") {
  try {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    const res = await apiRequest(`/employees${query}`);
    return res;
  } catch (err) {
    console.error("Failed to fetch employees from backend:", err);
    return { success: false, data: [] };
  }
}

export async function createEmployees(employees) {
  try {
    const res = await apiRequest("/employees", {
      method: "POST",
      body: JSON.stringify(employees),
    });
    return res;
  } catch (err) {
    throw err;
  }
}

export async function updateEmployeeById(id, employee) {
  try {
    const res = await apiRequest(`/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(employee),
    });
    return res;
  } catch (err) {
    throw err;
  }
}

export async function deleteEmployeeById(id) {
  try {
    const res = await apiRequest(`/employees/${id}`, {
      method: "DELETE",
    });
    return res;
  } catch (err) {
    throw err;
  }
}

export async function updateProfileSkills(skillsData) {
  try {
    const res = await apiRequest("/employee/me", {
      method: "PUT",
      body: JSON.stringify(skillsData),
    });
    return res;
  } catch (err) {
    throw err;
  }
}

export async function uploadProfilePicture(file) {
  try {
    const formData = new FormData();
    formData.append("profilePicture", file);
    const res = await apiRequest("/employee/me/profile-picture", {
      method: "POST",
      body: formData,
    });
    return res;
  } catch (err) {
    throw err;
  }
}