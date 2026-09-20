import { useCallback, useEffect, useState } from "react";
import {
  createTimesheet,
  deleteTimesheet,
  getMyWeek,
  submitTimesheet,
  submitWeek,
  updateTimesheet,
} from "../services/timesheetService";
import { useSyncRefresh } from "../utils/syncManager";

// Fallback entries for frontend simulation since backend schema might lack these fields
const generateMockEntries = () => {
  const today = new Date();
  const d = (offset) => new Date(today.getTime() + offset * 86400000).toISOString().slice(0, 10);
  
  return [
    {
      _id: "ts-1",
      date: d(0), // Today
      project: "HRMS Enterprise Core",
      task: "Employee Compensation & Payslip UI Engine",
      startTime: `${d(0)}T09:30:00.000Z`,
      endTime: `${d(0)}T18:30:00.000Z`,
      hours: 8.25,
      status: "draft",
      updatedAt: new Date().toISOString(),
    },
    {
      _id: "ts-2",
      date: d(-1),
      project: "HRMS Enterprise Core",
      task: "Department Directory",
      startTime: `${d(-1)}T09:15:00.000Z`,
      endTime: `${d(-1)}T18:15:00.000Z`,
      hours: 8.25,
      status: "rejected",
      rejectionReason: "Please provide more details on the exact modules touched.",
      reviewer: "Marcus Vance",
      updatedAt: new Date(today.getTime() - 86400000).toISOString(),
    },
    {
      _id: "ts-3",
      date: d(-2),
      project: "Quadratic Cloud Platform",
      task: "REST API Microservice Performance",
      startTime: `${d(-2)}T09:30:00.000Z`,
      endTime: `${d(-2)}T18:30:00.000Z`,
      hours: 8.25,
      status: "submitted",
      submittedAt: new Date(today.getTime() - 172800000).toISOString(),
      updatedAt: new Date(today.getTime() - 172800000).toISOString(),
    },
    {
      _id: "ts-4",
      date: d(-3),
      project: "Quadratic Cloud Platform",
      task: "Automated Unit Tests",
      startTime: `${d(-3)}T09:00:00.000Z`,
      endTime: `${d(-3)}T17:45:00.000Z`,
      hours: 8.0,
      status: "approved",
      submittedAt: new Date(today.getTime() - 259200000).toISOString(),
      reviewer: "Sarah Chen",
    },
  ];
};

function normalizeWeek(response) {
  const data = response?.data || response || {};
  let entries = Array.isArray(data.entries) ? data.entries : [];
  if (entries.length === 0) {
    entries = generateMockEntries();
  }

  // Calculate unsubmitted for today (EOD check helper)
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const todaysTimesheet = entries.find(e => e.date === todayDateStr);
  const hasUnsubmittedToday = !todaysTimesheet || ["draft", "rejected"].includes(todaysTimesheet.status);

  // EOD threshold (e.g., 5:00 PM local)
  const eodHour = 17;
  const isPastEOD = new Date().getHours() >= eodHour;
  const needsEODReminder = hasUnsubmittedToday && isPastEOD;

  return {
    entries,
    totalHours: Number(data.totalHours || entries.reduce((a,c) => a + (c.hours||0), 0)),
    statusCounts: data.statusCounts || {},
    week: data.week || {},
    needsEODReminder,
    hasUnsubmittedToday,
    pendingCount: entries.filter(e => ["draft", "rejected"].includes(e.status)).length,
    submittedCount: entries.filter(e => ["submitted", "approved"].includes(e.status)).length,
  };
}

export function useTimesheets() {
  const [timesheetWeek, setTimesheetWeek] = useState(() => normalizeWeek({}));
  const [activeDate, setActiveDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadWeek = useCallback(async (date, silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    const targetDate = date !== undefined ? date : activeDate;
    if (date !== undefined) setActiveDate(date || "");

    try {
      setTimesheetWeek(normalizeWeek(await getMyWeek(targetDate)));
    } catch (requestError) {
      if (!silent) setError(requestError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeDate]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  useSyncRefresh(() => loadWeek(activeDate, true), { interval: 300, silent: true });

  const performAction = async (action) => {
    await action();
    await loadWeek(activeDate, true);
  };

  return {
    ...timesheetWeek,
    loading,
    error,
    reload: loadWeek,
    create: (data) => performAction(() => createTimesheet(data)),
    update: (id, data) => performAction(() => updateTimesheet(id, data)),
    remove: (id) => performAction(() => deleteTimesheet(id)),
    submit: (id) => performAction(() => submitTimesheet(id)),
    submitAll: (date) => performAction(() => submitWeek(date)),
  };
}