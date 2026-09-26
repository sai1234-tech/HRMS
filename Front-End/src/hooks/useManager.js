import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "../services/apiClient";
import { useSyncRefresh } from "../utils/syncManager";

export const useManager = () => {
  const [overview, setOverview] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await apiRequest("/manager/overview");
      if (res.success) setOverview(res.data);
    } catch (err) {
      console.error("Failed to fetch overview:", err);
    }
  }, []);

  const fetchLeaves = useCallback(async () => {
    try {
      const res = await apiRequest("/manager/team-leaves");
      if (res.success) setLeaves(res.data);
    } catch (err) {
      console.error("Failed to fetch leaves:", err);
    }
  }, []);

  const fetchTimesheets = useCallback(async () => {
    try {
      const res = await apiRequest("/manager/team-timesheets");
      if (res.success) setTimesheets(res.data);
    } catch (err) {
      console.error("Failed to fetch timesheets:", err);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await apiRequest("/manager/projects");
      if (res.success) setProjects(res.data);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    }
  }, []);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchOverview(),
        fetchLeaves(),
        fetchTimesheets(),
        fetchProjects(),
      ]);
    } catch (err) {
      if (!silent) setError("Failed to load manager data");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [fetchOverview, fetchLeaves, fetchTimesheets, fetchProjects]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Real-time live sync: refresh on mutations, cross-tab events, window focus & 5s background interval
  useSyncRefresh(loadAll, { interval: 5000, silent: true });

  const approveLeave = async (id, remarks) => {
    try {
      const res = await apiRequest(`/manager/team-leaves/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "approved", remarks }),
      });
      if (res.success) {
        await loadAll(true);
        return true;
      }
    } catch (err) {
      console.error("Approve leave error:", err);
      return false;
    }
  };

  const rejectLeave = async (id, remarks) => {
    try {
      const res = await apiRequest(`/manager/team-leaves/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "rejected", remarks }),
      });
      if (res.success) {
        await loadAll(true);
        return true;
      }
    } catch (err) {
      console.error("Reject leave error:", err);
      return false;
    }
  };

  const approveTimesheet = async (id, comment) => {
    try {
      const res = await apiRequest(`/manager/team-timesheets/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "approved", reviewComment: comment }),
      });
      if (res.success) {
        await loadAll(true);
        return true;
      }
    } catch (err) {
      console.error("Approve timesheet error:", err);
      return false;
    }
  };

  const rejectTimesheet = async (id, comment) => {
    try {
      const res = await apiRequest(`/manager/team-timesheets/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "rejected", reviewComment: comment }),
      });
      if (res.success) {
        await loadAll(true);
        return true;
      }
    } catch (err) {
      console.error("Reject timesheet error:", err);
      return false;
    }
  };

  return {
    overview,
    leaves,
    timesheets,
    projects,
    loading,
    error,
    refresh: loadAll,
    approveLeave,
    rejectLeave,
    approveTimesheet,
    rejectTimesheet,
  };
};
