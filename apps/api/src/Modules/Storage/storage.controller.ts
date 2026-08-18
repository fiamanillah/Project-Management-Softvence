import { Request, Response } from "express";
import { BaseController } from "@/core/BaseController";
import { StorageService } from "./storage.service";
import { AppError } from "@/core/errors/AppError";
import { HTTPStatusCode } from "@/types/HTTPStatusCode";

export class StorageController extends BaseController {
  constructor(private readonly storageService: StorageService) {
    super();
  }

  /**
   * Upload file directly via server multipart upload
   */
  public async uploadFile(req: Request, res: Response): Promise<void> {
    const file = req.file;
    if (!file) {
      throw new AppError({
        statusCode: HTTPStatusCode.BAD_REQUEST,
        message: "No file uploaded. Please provide a file in the 'file' field.",
        code: "FILE_REQUIRED",
      });
    }


    const isPublic =
      req.body.isPublic === "true" ||
      req.body.isPublic === true ||
      req.body.isPublic === "1";

    const entityType = req.body.entityType;
    const entityId = req.body.entityId;

    const result = await this.storageService.uploadFile(req.user, {
      fileName: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
      entityType,
      entityId,
      isPublic,
    });

    this.sendCreatedResponse(req, res, result, "File uploaded successfully");
  }

  /**
   * Generate presigned PUT URL for direct frontend client upload
   */
  public async getPresignedUploadUrl(req: Request, res: Response): Promise<void> {
    const result = await this.storageService.getPresignedUploadUrl(req.user, req.body);
    this.sendResponse(req, res, "Presigned upload URL generated successfully", HTTPStatusCode.OK, result);
  }

  /**
   * Confirm direct client upload and register attachment in DB
   */
  public async confirmUpload(req: Request, res: Response): Promise<void> {
    const result = await this.storageService.confirmUpload(req.user, req.body);
    this.sendCreatedResponse(req, res, result, "Upload confirmed successfully");
  }

  /**
   * Generate presigned GET URL for secure download of private files
   */
  public async getPresignedDownloadUrl(req: Request, res: Response): Promise<void> {
    const result = await this.storageService.getPresignedDownloadUrl(req.user, req.body);
    this.sendResponse(req, res, "Presigned download URL generated successfully", HTTPStatusCode.OK, result);
  }

  /**
   * Stream a private or public file through the API server
   */
  public async streamFile(req: Request, res: Response): Promise<void> {
    const key = (req.params.key || req.query.key) as string;
    if (!key) {
      throw new AppError({
        statusCode: HTTPStatusCode.BAD_REQUEST,
        message: "Storage file key is required",
        code: "KEY_REQUIRED",
      });
    }

    const isPublic = req.query.isPublic === "true" || req.query.isPublic === "1";
    const range = req.headers.range;

    const result = await this.storageService.getFileStream(req.user, key, isPublic, range);

    if (result.contentRange) {
      res.status(HTTPStatusCode.PARTIAL_CONTENT);
      res.setHeader("Content-Range", result.contentRange);
    } else {
      res.status(HTTPStatusCode.OK);
    }

    if (result.contentType) res.setHeader("Content-Type", result.contentType);
    if (result.contentLength) res.setHeader("Content-Length", result.contentLength);
    if (result.acceptRanges) res.setHeader("Accept-Ranges", result.acceptRanges);
    if (result.eTag) res.setHeader("ETag", result.eTag);

    result.stream.pipe(res);
  }

  /**
   * Delete a file and its attachment records
   */
  public async deleteFile(req: Request, res: Response): Promise<void> {
    const key = (req.params.key || req.body.key || req.query.key) as string;
    if (!key) {
      throw new AppError({
        statusCode: HTTPStatusCode.BAD_REQUEST,
        message: "Storage file key is required",
        code: "KEY_REQUIRED",
      });
    }


    const isPublic =
      req.body.isPublic === "true" ||
      req.body.isPublic === true ||
      req.query.isPublic === "true";

    const result = await this.storageService.deleteFile(req.user, key, isPublic);
    this.sendResponse(req, res, "File deleted successfully", HTTPStatusCode.OK, result);
  }

  /**
   * List files or attachments with pagination
   */
  public async listFiles(req: Request, res: Response): Promise<void> {
    const result = await this.storageService.listFiles(req.user, req.query as any);
    this.sendResponse(req, res, "Files retrieved successfully", HTTPStatusCode.OK, result);
  }

  /**
   * Storage health check
   */
  public async getHealth(req: Request, res: Response): Promise<void> {
    const health = await this.storageService.getHealth();
    this.sendResponse(req, res, "Storage health check status", HTTPStatusCode.OK, health);
  }
}
