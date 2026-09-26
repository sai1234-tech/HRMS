import { useCallback, useEffect, useState } from "react";
import { getEmployee } from "../services/employeeService";
import { useSyncRefresh } from "../utils/syncManager";

export function useEmployee() {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEmployee = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const response = await getEmployee();
      if (response && (response.employee || response.data)) {
        setEmployee(response.employee || response.data);
      } else {
        const storedUser = sessionStorage.getItem("hrms_user")
          ? JSON.parse(sessionStorage.getItem("hrms_user"))
          : null;
        setEmployee(storedUser);
      }
    } catch (requestError) {
      const storedUser = sessionStorage.getItem("hrms_user")
        ? JSON.parse(sessionStorage.getItem("hrms_user"))
        : null;
      if (storedUser) {
        setEmployee(storedUser);
      } else if (!silent) {
        setError(requestError.message);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  useSyncRefresh(loadEmployee, { interval: 30000, silent: true });

  return { employee, loading, error, reload: loadEmployee };
}
