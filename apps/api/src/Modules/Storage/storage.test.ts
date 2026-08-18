declare const describe: any;
declare const expect: any;
declare const it: any;

import {
  presignedUploadRequestSchema,
  presignedDownloadRequestSchema,
  confirmUploadRequestSchema,
  deleteFileRequestSchema,
  listFilesQuerySchema,
} from "./StorageDTO";
import { storagePermissions } from "./storage.manifest";

describe("Storage Module DTO Validation & Manifest Tests", () => {
  describe("DTO Schema Validation", () => {
    it("should validate valid presigned upload requests", () => {
      const validPayload = {
        fileName: "quarterly-report.pdf",
        mimeType: "application/pdf",
        isPublic: false,
        entityType: "project",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = presignedUploadRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("should reject presigned upload requests without filename", () => {
      const invalidPayload = {
        fileName: "",
        mimeType: "image/png",
      };

      const result = presignedUploadRequestSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("should validate presigned download request schemas", () => {
      const validPayload = {
        key: "private/project/123/report.pdf",
        expiresInSeconds: 1800,
        isPublic: false,
      };

      const result = presignedDownloadRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("should validate confirm upload schemas", () => {
      const validPayload = {
        key: "private/issue/123/screenshot.png",
        fileName: "screenshot.png",
        entityType: "issue",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
      };

      const result = confirmUploadRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("should validate delete file schemas", () => {
      const validPayload = {
        key: "public/avatars/user-123.jpg",
        isPublic: true,
      };

      const result = deleteFileRequestSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("should validate list files query parameters with coerce", () => {
      const query = {
        limit: "50",
        isPublic: "true",
      };

      const result = listFilesQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(result.data.isPublic).toBe(true);
      }
    });
  });

  describe("Permissions Manifest", () => {
    it("should contain all essential storage permission definitions", () => {
      const codes = storagePermissions.map((p) => p.code);
      expect(codes).toContain("storage.upload");
      expect(codes).toContain("storage.view");
      expect(codes).toContain("storage.delete");
      expect(codes).toContain("storage.manage");
    });
  });
});
