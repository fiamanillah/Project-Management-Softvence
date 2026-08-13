"use client";

import * as React from "react";
import { api, ApiError } from "./api";

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  systemRole: "SuperAdmin" | "Admin" | "Staff";
  designationId?: string;
}

export interface PermissionMap {
  [code: string]: {
    allowed: boolean;
    scope: string;
    module?: string;
    description?: string;
  };
}

interface AuthContextType {
  user: User | null;
  permissions: PermissionMap;
  token: string | null;
  isLoading: boolean;
  can: (permissionCode: string) => boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [permissions, setPermissions] = React.useState<PermissionMap>({});
  const [token, setToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  const fetchPermissions = React.useCallback(async () => {
    try {
      const res = await api.get<{ permissions: PermissionMap }>("/auth/permissions");
      if (res && res.permissions) {
        setPermissions(res.permissions);
      }
    } catch (err) {
      console.warn("Failed to fetch permissions map:", err);
    }
  }, []);

  // Initialize auth from localStorage / token
  React.useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
        fetchPermissions();
      } catch {
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, [fetchPermissions]);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ accessToken: string; user: User }>("/auth/login", {
      email,
      password,
    });

    if (data.accessToken && data.user) {
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("user", JSON.stringify(data.user));
      setToken(data.accessToken);
      setUser(data.user);

      // Hydrate permission map
      await fetchPermissions();
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore logout errors
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
      setPermissions({});
    }
  };

  const refreshPermissions = async () => {
    await fetchPermissions();
  };

  const can = (permissionCode: string): boolean => {
    if (user?.systemRole === "SuperAdmin") return true;
    const perm = permissions[permissionCode];
    return !!perm?.allowed;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        token,
        isLoading,
        can,
        login,
        logout,
        refreshPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
