import { useEffect, useRef } from "react";

// Event key used across windows and storage
export const HRMS_SYNC_EVENT = "hrms_data_updated";

/**
 * Dispatches an event to notify all active hooks and browser windows
 * that a mutation occurred in the backend.
 */
export function broadcastDataChange(category = "general", details = {}) {
  try {
    const timestamp = Date.now();
    const event = new CustomEvent(HRMS_SYNC_EVENT, {
      detail: { category, details, timestamp },
    });
    window.dispatchEvent(event);
    localStorage.setItem(HRMS_SYNC_EVENT, String(timestamp));
  } catch {
    // Ignore environments where window/localStorage is unavailable
  }
}

/**
 * Custom hook to keep any component or data hook synchronized with backend changes in milliseconds.
 * Triggers refresh on:
 * 1. Window focus (user returns to browser or clicks window)
 * 2. Document visibility change (user switches tabs)
 * 3. In-app data mutation events (hrms_data_updated)
 * 4. Cross-tab storage events (actions performed in another tab)
 * 5. Periodic visible poll (every 3500ms when tab is active)
 */
export function useSyncRefresh(callback, options = {}) {
  const {
    interval = 3500,
    enabled = true,
    silent = true,
  } = options;

  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    let isDestroyed = false;
    let isFetching = false;

    const triggerRefresh = async () => {
      if (isDestroyed || isFetching) return;
      if (typeof callbackRef.current === "function") {
        try {
          isFetching = true;
          await callbackRef.current(silent);
        } catch {
          // Silent failure during background sync to avoid user disruption
        } finally {
          isFetching = false;
        }
      }
    };

    // 1. Window focus listener
    const handleFocus = () => {
      triggerRefresh();
    };

    // 2. Visibility change listener
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        triggerRefresh();
      }
    };

    // 3. Custom in-app event
    const handleCustomSync = () => {
      triggerRefresh();
    };

    // 4. Cross-tab storage event
    const handleStorage = (e) => {
      if (e.key === HRMS_SYNC_EVENT) {
        triggerRefresh();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener(HRMS_SYNC_EVENT, handleCustomSync);
    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibility);

    // 5. Periodic visible background sync
    let timerId = null;
    if (interval && interval > 0) {
      timerId = setInterval(() => {
        if (document.visibilityState === "visible") {
          triggerRefresh();
        }
      }, interval);
    }

    return () => {
      isDestroyed = true;
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(HRMS_SYNC_EVENT, handleCustomSync);
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (timerId) clearInterval(timerId);
    };
  }, [enabled, interval, silent]);
}
