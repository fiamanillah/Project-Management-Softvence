declare const describe: any;
declare const expect: any;
declare const it: any;

import {
  validateStorageConfig,
  generateStorageKey,
  normalizeKey,
  lookupMimeType,
  sanitizeFileName,
  StorageError,
  BucketNotFoundError,
  FileNotFoundError,
  StoragePayloadTooLargeError,
  StorageManager,
} from "../index";

describe("@workspace/storage Unit Tests", () => {
  describe("Config Validation", () => {
    it("should accept valid custom configuration and apply sensible defaults", () => {
      const config = validateStorageConfig({
        endpoint: "http://localhost:9000",
        credentials: {
          accessKeyId: "admin",
          secretAccessKey: "password123",
        },
        publicBucket: "custom-public",
        privateBucket: "custom-private",
      });

      expect(config.endpoint).toBe("http://localhost:9000");
      expect(config.region).toBe("us-east-1");
      expect(config.publicBucket).toBe("custom-public");
      expect(config.privateBucket).toBe("custom-private");
      expect(config.forcePathStyle).toBe(true);
      expect(config.retryCount).toBe(3);
    });

    it("should reject invalid endpoint URL format", () => {
      expect(() => {
        validateStorageConfig({
          endpoint: "not-a-valid-url",
        });
      }).toThrow();
    });
  });

  describe("Key Sanitization & MIME Utilities", () => {
    it("should generate structured key with year, month, and sanitized filename", () => {
      const key = generateStorageKey({
        entityType: "project",
        entityId: "123e4567-e89b-12d3-a456-426614174000",
        fileName: "Important Contract (Final) #1.pdf",
        isPublic: false,
      });

      expect(key).toContain("private/project/123e4567-e89b-12d3-a456-426614174000/");
      expect(key).toContain(".pdf");
      expect(key).not.toContain(" ");
      expect(key).not.toContain("#");
      expect(key).not.toContain("(");
    });

    it("should normalize redundant slashes in keys", () => {
      const rawKey = "///uploads//images///logo.png";
      expect(normalizeKey(rawKey)).toBe("uploads/images/logo.png");
    });

    it("should correctly identify MIME types", () => {
      expect(lookupMimeType("document.pdf")).toBe("application/pdf");
      expect(lookupMimeType("photo.png")).toBe("image/png");
      expect(lookupMimeType("audio.mp3")).toBe("audio/mpeg");
      expect(lookupMimeType("unknown.xyz123")).toBe("application/octet-stream");
    });

    it("should sanitize file names safely", () => {
      expect(sanitizeFileName("My Document @ 2026!.docx")).toBe("my-document-2026.docx");
      expect(sanitizeFileName("")).toBe("file");
    });
  });

  describe("Error Handling Hierarchy", () => {
    it("should create domain errors with accurate HTTP status codes and details", () => {
      const notFoundErr = new FileNotFoundError("my-bucket", "missing.jpg");
      expect(notFoundErr.statusCode).toBe(404);
      expect(notFoundErr.code).toBe("FILE_NOT_FOUND");
      expect(notFoundErr.message).toContain("missing.jpg");

      const bucketErr = new BucketNotFoundError("non-existent-bucket");
      expect(bucketErr.statusCode).toBe(404);
      expect(bucketErr.code).toBe("BUCKET_NOT_FOUND");

      const tooLargeErr = new StoragePayloadTooLargeError(1000, 2000);
      expect(tooLargeErr.statusCode).toBe(413);
      expect(tooLargeErr.code).toBe("STORAGE_PAYLOAD_TOO_LARGE");
    });
  });

  describe("StorageManager Client Construction & URL Generation", () => {
    const manager = new StorageManager({
      endpoint: "http://127.0.0.1:9000",
      credentials: {
        accessKeyId: "rustfsadmin",
        secretAccessKey: "rustfsadmin",
      },
      publicBucket: "my-public-bucket",
      privateBucket: "my-private-bucket",
      forcePathStyle: true,
    });

    it("should generate correct path-style public URL", () => {
      const publicUrl = manager.getPublicUrl("my-public-bucket", "avatars/user-1.png");
      expect(publicUrl).toBe("http://127.0.0.1:9000/my-public-bucket/avatars/user-1.png");
    });

    it("should support custom CDN public URL prefix when configured", () => {
      const cdnManager = new StorageManager({
        endpoint: "http://127.0.0.1:9000",
        publicUrlPrefix: "https://cdn.example.com",
      });

      const publicUrl = cdnManager.getPublicUrl("my-public-bucket", "assets/banner.jpg");
      expect(publicUrl).toBe("https://cdn.example.com/assets/banner.jpg");
    });
  });
});
