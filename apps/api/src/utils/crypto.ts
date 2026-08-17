import argon2 from "argon2";
import crypto from "crypto";
import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken";
import { env } from "@/env";

export interface JWTCustomPayload {
  sub: string; // user_id
  systemRole: string; // system_role
  roleId: string; // role_id (authorization role)
  designationId?: string | null; // designation_id (optional HR title)
}

/**
 * Hash a plain password using Argon2id with tuned parameters.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: env.ARGON_MEMORY_COST, // default: 65536 (64MB)
    timeCost: env.ARGON_TIME_COST,     // default: 3
    parallelism: env.ARGON_PARALLELISM, // default: 4
  });
}

/**
 * Verify a plain password against an Argon2id hash.
 */
export async function verifyPassword(
  hash: string,
  plainText: string,
): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainText);
  } catch (err) {
    return false;
  }
}

/**
 * Generate a cryptographically secure opaque 64-byte hex string for refresh tokens.
 */
export function generateOpaqueToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

/**
 * Hash an opaque token using SHA-256 before database storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Sign a JWT access token containing strictly identity claims.
 * Uses RS256 if RSA private key is configured, otherwise HS256 with JWT_SECRET.
 */
export function signAccessToken(payload: JWTCustomPayload): string {
  const algorithm = env.JWT_PRIVATE_KEY ? "RS256" : "HS256";
  const key = env.JWT_PRIVATE_KEY || env.JWT_SECRET;

  const options: SignOptions = {
    algorithm,
    expiresIn: (env.JWT_ACCESS_EXPIRES_IN || "15m") as any,
    issuer: env.JWT_ISSUER,
  };

  return jwt.sign(payload, key, options);
}

/**
 * Verify and decode an Access Token.
 */
export function verifyAccessToken(token: string): JWTCustomPayload {
  const algorithm = env.JWT_PUBLIC_KEY ? "RS256" : "HS256";
  const key = env.JWT_PUBLIC_KEY || env.JWT_SECRET;

  const options: VerifyOptions = {
    algorithms: [algorithm],
    issuer: env.JWT_ISSUER,
  };

  const decoded = jwt.verify(token, key, options) as jwt.JwtPayload & JWTCustomPayload;
  
  if (!decoded.sub || !decoded.systemRole) {
    throw new Error("Invalid JWT payload identity structure");
  }

  return {
    sub: decoded.sub,
    systemRole: decoded.systemRole,
    roleId: decoded.roleId || (decoded as any).designationId || "",
    designationId: decoded.designationId || null,
  };
}
