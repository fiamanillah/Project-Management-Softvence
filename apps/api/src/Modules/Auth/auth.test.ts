declare const describe: any;
declare const expect: any;
declare const it: any;

import {
  hashPassword,
  verifyPassword,
  generateOpaqueToken,
  hashToken,
  signAccessToken,
  verifyAccessToken,
} from "@/utils/crypto";

describe("Authentication Security & Crypto Utilities", () => {
  it("should hash password with Argon2id and verify correctly", async () => {
    const rawPassword = "SuperSecretPassword123!";
    const hash = await hashPassword(rawPassword);

    expect(hash).toContain("$argon2id$");
    expect(await verifyPassword(hash, rawPassword)).toBe(true);
    expect(await verifyPassword(hash, "WrongPassword")).toBe(false);
  });

  it("should generate cryptographically secure 64-byte opaque token and hash with SHA-256", () => {
    const rawToken = generateOpaqueToken();
    expect(rawToken.length).toBe(128); // 64 bytes in hex string format

    const hashedToken = hashToken(rawToken);
    expect(hashedToken.length).toBe(64); // SHA-256 hex string format

    // Different tokens generate different hashes
    const anotherRawToken = generateOpaqueToken();
    expect(hashToken(anotherRawToken)).not.toBe(hashedToken);
  });

  it("should sign JWT access token with identity claims only and verify successfully", () => {
    const identityPayload = {
      sub: "123e4567-e89b-12d3-a456-426614174000",
      systemRole: "SuperAdmin",
      designationId: "987f6543-e21b-12d3-a456-426614174000",
    };

    const token = signAccessToken(identityPayload);
    expect(typeof token).toBe("string");

    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(identityPayload.sub);
    expect(decoded.systemRole).toBe(identityPayload.systemRole);
    expect(decoded.designationId).toBe(identityPayload.designationId);

    // Verify NO permissions array or scope types are embedded
    expect((decoded as any).permissions).toBeUndefined();
    expect((decoded as any).scope_type).toBeUndefined();
  });

  it("should validate change password schema requirements", async () => {
    const { changePasswordBodySchema } = await import("@workspace/shared");

    const validPayload = {
      currentPassword: "OldTempPassword123!",
      newPassword: "NewPermanentPassword456!",
    };
    const parsed = changePasswordBodySchema.safeParse(validPayload);
    expect(parsed.success).toBe(true);

    const invalidShortPassword = {
      currentPassword: "OldTempPassword123!",
      newPassword: "short",
    };
    const parsedShort = changePasswordBodySchema.safeParse(invalidShortPassword);
    expect(parsedShort.success).toBe(false);
  });
});

