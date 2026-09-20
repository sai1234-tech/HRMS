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
      setEmployee(response.employee || response);
    } catch (requestError) {
      if (!silent) setError(requestError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  useSyncRefresh(loadEmployee, { interval: 300, silent: true });

  return { employee, loading, error, reload: loadEmployee };
}
