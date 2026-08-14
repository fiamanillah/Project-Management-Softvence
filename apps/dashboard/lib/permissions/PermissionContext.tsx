"use client";

import * as React from "react";

export type PermissionMap = Record<string, boolean>;

export const PermissionContext = React.createContext<PermissionMap>({});

export function usePermissions(): PermissionMap {
  const context = React.useContext(PermissionContext);
  return context ?? {};
}

export function hasPermission(map: PermissionMap, code: string): boolean {
  if (!code) return true;
  return map[code] === true;
}

export function PermissionProvider({
  permissions,
  children,
}: {
  permissions: PermissionMap;
  children: React.ReactNode;
}) {
  return (
    <PermissionContext.Provider value={permissions}>
      {children}
    </PermissionContext.Provider>
  );
}
