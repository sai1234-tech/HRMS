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

const calculateWorkingHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) {
    return 0;
  }

  const milliseconds = new Date(checkOut) - new Date(checkIn);

  const hours = milliseconds / (1000 * 60 * 60);

  return Number(hours.toFixed(2));
};

const calculateLateMinutes = (
  checkIn,
  officeStartHour = 9,
  officeStartMinute = 0
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

const calculateOvertime = (
  workingHours,
  requiredWorkingHours = 8
) => {
  if (workingHours <= requiredWorkingHours) {
    return 0;
  }

  return Number(
    (workingHours - requiredWorkingHours).toFixed(2)
  );
};

const OFFICE_START_HOUR = 9;
const OFFICE_START_MINUTE = 0;
const OFFICE_END_HOUR = 17; // 5:00 PM End of working day
const OFFICE_END_MINUTE = 0;

const isWorkdayEnded = (date = new Date(), endHour = OFFICE_END_HOUR, endMinute = OFFICE_END_MINUTE) => {
  const end = new Date(date);
  end.setHours(endHour, endMinute, 0, 0);
  return date >= end;
};

const getLiveAttendanceStatus = (
  attendance,
  now = new Date(),
  endHour = OFFICE_END_HOUR,
  endMinute = OFFICE_END_MINUTE
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
  startOfDay,
  endOfDay,
  calculateWorkingHours,
  calculateLateMinutes,
  calculateOvertime,
  isWorkdayEnded,
  getLiveAttendanceStatus,
  OFFICE_START_HOUR,
  OFFICE_END_HOUR,
};



