import { Response } from "express";
import { config } from "@/core/config";

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string
): void {
  const isProduction = config.server.isProduction;

  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

export function clearAuthCookies(res: Response): void {
  const isProduction = config.server.isProduction;

  res.cookie("access_token", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    expires: new Date(0),
  });

  res.cookie("refresh_token", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    expires: new Date(0),
  });
}
