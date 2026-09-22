import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, loginUser, signupUser } from "../services/authService";
import { normalizeRole } from "../utils/auth";
import { getDemoFallbackSession } from "../data/demoAccounts";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const saveSession = (response) => {
    const session = response?.data && (response.data.user || response.data.token) ? response.data : response;
    const normalizedUser = { ...session.user, role: normalizeRole(session.user) };
    sessionStorage.setItem("hrms_token", session.token);
    sessionStorage.setItem("hrms_user", JSON.stringify(normalizedUser));

    if (session.employee) {
      sessionStorage.setItem(
        "hrms_employee",
        JSON.stringify(session.employee),
      );
    }

    setUser(normalizedUser);
    setEmployee(session.employee || null);
    return { ...session, user: normalizedUser };
  };

  const login = async (email, password) => {
    try {
      const response = await loginUser({ email, password });
      sessionStorage.removeItem("hrms_demo_mode");
      return saveSession(response);
    } catch (apiError) {
      // If backend is unreachable or on a static deploy like Netlify, gracefully fall back to Demo Mode
      const demoSession = getDemoFallbackSession(email);
      if (demoSession) {
        console.warn("[Auth] Backend unreachable, falling back to Demo Mode:", demoSession.user.role);
        sessionStorage.setItem("hrms_demo_mode", "true");
        return saveSession(demoSession);
      }
      throw apiError;
    }
  };

  const signup = async (userData) => {
    const response = await signupUser(userData);

    const session = response?.data && (response.data.user || response.data.token) ? response.data : response;
    if (session.token && session.user) {
      return saveSession(response);
    }

    return login(userData.email, userData.password);
  };

  const updateProfilePhoto = (photoUrl) => {
    if (!photoUrl) return;
    sessionStorage.setItem("hrms_profile_photo", photoUrl);
    localStorage.setItem("hrms_profile_photo", photoUrl);

    setEmployee((prev) => {
      const updated = prev ? { ...prev, profilePhoto: photoUrl } : { profilePhoto: photoUrl };
      sessionStorage.setItem("hrms_employee", JSON.stringify(updated));
      return updated;
    });

    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, profilePhoto: photoUrl };
      sessionStorage.setItem("hrms_user", JSON.stringify(updated));
      return updated;
    });

    window.dispatchEvent(
      new CustomEvent("hrms:profile_photo_updated", {
        detail: { profilePhoto: photoUrl },
      })
    );
  };

  const logout = () => {
    sessionStorage.removeItem("hrms_token");
    sessionStorage.removeItem("hrms_user");
    sessionStorage.removeItem("hrms_employee");
    sessionStorage.removeItem("hrms_profile_photo");
    sessionStorage.removeItem("hrms_demo_mode");
    localStorage.removeItem("hrms_profile_photo");

    setUser(null);
    setEmployee(null);
  };

  useEffect(() => {
    const restoreSession = async () => {
      const token = sessionStorage.getItem("hrms_token");

      if (!token) {
        setLoading(false);
        return;
      }

      // Check if session is a standalone demo session
      if (
        token.startsWith("demo-token-") ||
        sessionStorage.getItem("hrms_demo_mode") === "true"
      ) {
        try {
          const storedUser = JSON.parse(sessionStorage.getItem("hrms_user") || "null");
          const storedEmp = JSON.parse(sessionStorage.getItem("hrms_employee") || "null");
          if (storedUser) {
            setUser({ ...storedUser, role: normalizeRole(storedUser) });
            setEmployee(storedEmp);
            setLoading(false);
            return;
          }
        } catch (e) {
          // ignore parse error and proceed to normal flow
        }
      }

      try {
        const response = await getCurrentUser();

        const session = response?.data && response.data.user ? response.data : response;
        setUser({ ...session.user, role: normalizeRole(session.user) });
        const restoredEmp = session.employee || (sessionStorage.getItem("hrms_employee") ? JSON.parse(sessionStorage.getItem("hrms_employee")) : null);
        setEmployee(restoredEmp);

        const cachedPhoto = restoredEmp?.profilePhoto || sessionStorage.getItem("hrms_profile_photo") || localStorage.getItem("hrms_profile_photo");
        if (cachedPhoto) {
          sessionStorage.setItem("hrms_profile_photo", cachedPhoto);
          localStorage.setItem("hrms_profile_photo", cachedPhoto);
        }
      } catch (error) {
        if (!token.startsWith("demo-token-")) {
          logout();
        }
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, employee, login, signup, logout, loading, updateProfilePhoto }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
