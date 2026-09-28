const SHIFT_CONFIG = {
  shiftStart: "09:30 AM IST",
  shiftEnd: "06:30 PM IST",
  officeStartHour: 9,
  officeStartMinute: 30,
  officeEndHour: 18,
  officeEndMinute: 30,
  expectedWorkingHours: 8,
  lunchBreakMinutes: 45,
  timeZone: "Asia/Kolkata",
};

const startOfDay = (date = new Date()) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const endOfDay = (date = new Date()) => {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
};

// Calculate net working hours by deducting lunch break (45 mins = 0.75 hrs) for shifts >= 4 hours
const calculateWorkingHours = (checkIn, checkOut, breakMinutes = SHIFT_CONFIG.lunchBreakMinutes) => {
  if (!checkIn || !checkOut) {
    return 0;
  }

  const milliseconds = new Date(checkOut) - new Date(checkIn);
  const rawHours = milliseconds / (1000 * 60 * 60);
  if (rawHours <= 0) return 0;

  // Deduct lunch break (45 mins / 0.75 hrs) if shift span is at least 4 hours
  const breakHours = rawHours >= 4 ? breakMinutes / 60 : 0;
  const netHours = Math.max(0, rawHours - breakHours);

  return Number(netHours.toFixed(2));
};

// Calculate late arrival minutes relative to 09:30 AM IST
const calculateLateMinutes = (
  checkIn,
  officeStartHour = SHIFT_CONFIG.officeStartHour,
  officeStartMinute = SHIFT_CONFIG.officeStartMinute
) => {
  const checkInDate = new Date(checkIn);
  const expectedTime = new Date(checkInDate);

  expectedTime.setHours(
    officeStartHour,
    officeStartMinute,
    0,
    0
  );

  if (checkInDate <= expectedTime) {
    return 0;
  }

  const milliseconds = checkInDate - expectedTime;
  return Math.floor(milliseconds / (1000 * 60));
};

// Calculate overtime relative to expected 8 net working hours
const calculateOvertime = (
  workingHours,
  requiredWorkingHours = SHIFT_CONFIG.expectedWorkingHours
) => {
  if (workingHours <= requiredWorkingHours) {
    return 0;
  }

  return Number((workingHours - requiredWorkingHours).toFixed(2));
};

const isWorkdayEnded = (
  date = new Date(),
  endHour = SHIFT_CONFIG.officeEndHour,
  endMinute = SHIFT_CONFIG.officeEndMinute
) => {
  const end = new Date(date);
  end.setHours(endHour, endMinute, 0, 0);
  return date >= end;
};

const getLiveAttendanceStatus = (
  attendance,
  now = new Date(),
  endHour = SHIFT_CONFIG.officeEndHour,
  endMinute = SHIFT_CONFIG.officeEndMinute
) => {
  if (attendance) {
    if (attendance.checkOut) {
      return attendance.status || "Completed";
    }
    if (attendance.checkIn) {
      return attendance.status || "Checked In";
    }
    if (attendance.status) {
      return attendance.status;
    }
  }

  // Employee hasn't checked in yet today
  if (isWorkdayEnded(now, endHour, endMinute)) {
    return "Absent";
  }
  return "Not Checked In";
};

module.exports = {
  SHIFT_CONFIG,
  startOfDay,
  endOfDay,
  calculateWorkingHours,
  calculateLateMinutes,
  calculateOvertime,
  isWorkdayEnded,
  getLiveAttendanceStatus,
  OFFICE_START_HOUR: SHIFT_CONFIG.officeStartHour,
  OFFICE_START_MINUTE: SHIFT_CONFIG.officeStartMinute,
  OFFICE_END_HOUR: SHIFT_CONFIG.officeEndHour,
  OFFICE_END_MINUTE: SHIFT_CONFIG.officeEndMinute,
};
