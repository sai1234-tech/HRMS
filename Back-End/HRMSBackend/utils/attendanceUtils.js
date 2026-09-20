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

module.exports = {
  startOfDay,
  endOfDay,
  calculateWorkingHours,
  calculateLateMinutes,
  calculateOvertime,
};


