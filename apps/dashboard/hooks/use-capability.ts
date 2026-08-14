"use client";

export type ResourceWithCapabilities<T extends Record<string, boolean> = Record<string, boolean>> = {
  _capabilities?: T;
};

/**
 * Checks if a resource possesses a specific precomputed server capability.
 * Follows Strategy Guide §3: "Frontend reads booleans off the object it already has in hand."
 */
export function hasCapability<T extends Record<string, boolean>>(
  resource: ResourceWithCapabilities<T> | null | undefined,
  capability: keyof T,
): boolean {
  if (!resource || !resource._capabilities) return false;
  return Boolean(resource._capabilities[capability]);
}

/**
 * Hook to read resource capability safely in components
 */
export function useCapability<T extends Record<string, boolean>>(
  resource: ResourceWithCapabilities<T> | null | undefined,
  capability: keyof T,
): boolean {
  return hasCapability(resource, capability);
}
