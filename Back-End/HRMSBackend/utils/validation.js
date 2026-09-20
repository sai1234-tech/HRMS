const EMAIL_REGEX =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

const PHONE_REGEX = /^[0-9]{10}$/;

const ALLOWED_ROLES = ["admin", "hr", "employee"];

const ALLOWED_EMPLOYMENT_TYPES = [
  "Full Time",
  "Part Time",
  "Contract",
  "Intern",
];

const validateName = (name) => {
  if (!name) return "Name is required";

  const value = String(name).trim();

  if (!value) return "Name is required";
  if (value.length < 3) return "Name must be at least 3 characters";
  if (value.length > 30) return "Name cannot exceed 30 characters";

  return null;
};

const validateEmail = (email) => {
  if (!email) return "Email is required";

  const value = String(email).trim().toLowerCase();

  if (!value) return "Email is required";

  if (!EMAIL_REGEX.test(value)) {
    return "Enter a valid email address";
  }

  return null;
};

const validatePassword = (password) => {
  if (!password) return "Password is required";

  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }

  if (password.length > 20) {
    return "Password cannot exceed 20 characters";
  }

  return null;
};

const validateRole = (role) => {
  if (!role) return "Role is required";

  if (!ALLOWED_ROLES.includes(role)) {
    return `Role must be one of: ${ALLOWED_ROLES.join(", ")}`;
  }

  return null;
};

const validatePhone = (phone) => {
  if (!phone) return null;

  const value = String(phone).trim();

  if (!PHONE_REGEX.test(value)) {
    return "Phone number must contain exactly 10 digits";
  }

  return null;
};

const validateEmployeeCode = (employeeCode) => {
  if (!employeeCode) return null;

  const value = String(employeeCode).trim();

  if (value.length < 2) {
    return "Employee code must be at least 2 characters";
  }

  if (value.length > 20) {
    return "Employee code cannot exceed 20 characters";
  }

  return null;
};

const validateJoiningDate = (joiningDate) => {
  if (!joiningDate) return "Joining date is required";

  const date = new Date(joiningDate);

  if (Number.isNaN(date.getTime())) {
    return "Joining date must be a valid date";
  }

  return null;
};

const validateEmploymentType = (employmentType) => {
  if (!employmentType) return "Employment type is required";

  if (!ALLOWED_EMPLOYMENT_TYPES.includes(employmentType)) {
    return `Employment type must be one of: ${ALLOWED_EMPLOYMENT_TYPES.join(
      ", "
    )}`;
  }

  return null;
};

const validateSalary = (salary) => {
  if (salary === undefined || salary === null || salary === "") {
    return "Salary is required";
  }

  const value = Number(salary);

  if (Number.isNaN(value)) {
    return "Salary must be a valid number";
  }

  if (value < 0) {
    return "Salary cannot be negative";
  }

  return null;
};

const validateSignupData = (data) => {
  const errors = {};

  const {
    name,
    email,
    password,
    role,
    phone,
    employeeCode,
    joiningDate,
    employmentType,
    salary,
  } = data;

  const nameError = validateName(name);
  if (nameError) errors.name = nameError;

  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;

  const passwordError = validatePassword(password);
  if (passwordError) errors.password = passwordError;

  const roleError = validateRole(role);
  if (roleError) errors.role = roleError;

  if (phone) {
    const phoneError = validatePhone(phone);
    if (phoneError) errors.phone = phoneError;
  }

  if (role === "employee") {
    const employeeCodeError = validateEmployeeCode(employeeCode);
    if (employeeCodeError) {
      errors.employeeCode = employeeCodeError;
    }

    const joiningDateError = validateJoiningDate(joiningDate);
    if (joiningDateError) {
      errors.joiningDate = joiningDateError;
    }

    const employmentTypeError =
      validateEmploymentType(employmentType);

    if (employmentTypeError) {
      errors.employmentType = employmentTypeError;
    }

    const salaryError = validateSalary(salary);
    if (salaryError) {
      errors.salary = salaryError;
    }
  }

  return errors;
};

module.exports = {
  EMAIL_REGEX,
  PHONE_REGEX,
  ALLOWED_ROLES,
  ALLOWED_EMPLOYMENT_TYPES,
  validateName,
  validateEmail,
  validatePassword,
  validateRole,
  validatePhone,
  validateEmployeeCode,
  validateJoiningDate,
  validateEmploymentType,
  validateSalary,
  validateSignupData,
};