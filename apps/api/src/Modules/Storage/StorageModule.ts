import multer from "multer";
import { BaseModule } from "@/core/BaseModule";
import { StorageService } from "./storage.service";
import { StorageController } from "./storage.controller";
import { validateRequest } from "@/middleware/validation";
import { authenticate } from "@/middleware/auth.middleware";
import { requirePermission } from "@/middleware/requirePermission";
import type { PrismaClient } from "@workspace/db";
import type { StorageManager } from "@workspace/storage";
import {
  presignedUploadRequestSchema,
  presignedDownloadRequestSchema,
  confirmUploadRequestSchema,
  deleteFileRequestSchema,
  listFilesQuerySchema,
} from "./StorageDTO";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

export class StorageModule extends BaseModule {
  public name: string = "StorageModule";
  public version: string = "1.0.0";
  public apiVersion: string = "v1";
  public basePath: string = "/storage";
  public dependencies?: string[] = ["prisma", "storage"];

  protected async setupUseCases(): Promise<void> {
    const prisma = this.context.getService("prisma") as PrismaClient;
    const storageManager = this.context.getService("storage") as StorageManager;

    this.registerService("StorageService", new StorageService(storageManager, prisma));
  }

  protected async setupControllers(): Promise<void> {
    const storageService = this.getService<StorageService>("StorageService");
    this.registerController("StorageController", new StorageController(storageService));
  }

  protected async setupRoutes(): Promise<void> {
    const controller = this.getController<StorageController>("StorageController");

    this.router.use(authenticate);

    // Storage health check
    this.router.get(
      "/health",
      requirePermission("storage.view"),
      controller.getHealth.bind(controller),
    );

    // Server-side multipart file upload
    this.router.post(
      "/upload",
      requirePermission("storage.upload"),
      upload.single("file"),
      controller.uploadFile.bind(controller),
    );

    // Direct client presigned upload URL generation
    this.router.post(
      "/presigned-upload-url",
      requirePermission("storage.upload"),
      validateRequest({ body: presignedUploadRequestSchema }),
      controller.getPresignedUploadUrl.bind(controller),
    );

    // Confirm direct client upload and create attachment record
    this.router.post(
      "/confirm-upload",
      requirePermission("storage.upload"),
      validateRequest({ body: confirmUploadRequestSchema }),
      controller.confirmUpload.bind(controller),
    );

    // Direct client presigned download URL generation for private files
    this.router.post(
      "/presigned-download-url",
      requirePermission("storage.view"),
      validateRequest({ body: presignedDownloadRequestSchema }),
      controller.getPresignedDownloadUrl.bind(controller),
    );

    // Stream file directly through API server
    this.router.get(
      "/stream/:key(*)",
      requirePermission("storage.view"),
      controller.streamFile.bind(controller),
    );

    // Delete file
    this.router.delete(
      "/files/:key(*)",
      requirePermission("storage.delete"),
      controller.deleteFile.bind(controller),
    );

    this.router.post(
      "/delete",
      requirePermission("storage.delete"),
      validateRequest({ body: deleteFileRequestSchema }),
      controller.deleteFile.bind(controller),
    );

    // List files & attachments
    this.router.get(
      "/files",
      requirePermission("storage.view"),
      validateRequest({ query: listFilesQuerySchema }),
      controller.listFiles.bind(controller),
    );
  }
}
