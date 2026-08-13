import { Request, Response } from "express";
import { BaseController } from "@/core/BaseController";
import { AppLogger } from "@/core/logging/logger";
import { AuthServices } from "./auth.service";
import {
  CreateUserDTO,
  LoginUserDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO,
} from "./AuthDTO";
import { env } from "@/env";
import { AuthenticationError } from "@/core/errors/AppError";

export class AuthController extends BaseController {
  private logger = new AppLogger("AuthController");

  constructor(private readonly authService: AuthServices) {
    super();
  }

  /**
   * Endpoint: POST /auth/register
   */
  public async createUser(req: Request, res: Response) {
    this.logger.info("Received request to create a new user");
    const { email, firstName, lastName, password } = req.validatedBody as CreateUserDTO;

    const user = await this.authService.register(email, firstName, lastName, password);
    return this.sendCreatedResponse(req, res, user, "User registered successfully");
  }

  /**
   * Endpoint: POST /auth/login
   */
  public async login(req: Request, res: Response) {
    this.logger.info("Received login request");
    const { email, password } = req.validatedBody as LoginUserDTO;
    const deviceInfo = req.headers["user-agent"] || "Unknown Device";

    const { accessToken, rawRefreshToken, user } = await this.authService.login(
      email,
      password,
      deviceInfo,
    );

    this.setRefreshCookie(res, rawRefreshToken);

    return this.sendResponse(
      req,
      res,
      "Login successful",
      200,
      { accessToken, user },
    );
  }

  /**
   * Endpoint: POST /auth/refresh
   */
  public async refresh(req: Request, res: Response) {
    this.logger.info("Received refresh token request");

    // Read incoming raw refresh token from cookie or request body
    const rawRefreshToken =
      req.cookies?.refreshToken || req.validatedBody?.refreshToken;

    if (!rawRefreshToken) {
      throw new AuthenticationError("Refresh token missing from request");
    }

    const deviceInfo = req.headers["user-agent"] || "Unknown Device";

    const { accessToken, rawRefreshToken: newRawRefreshToken, user } =
      await this.authService.refresh(rawRefreshToken, deviceInfo);

    this.setRefreshCookie(res, newRawRefreshToken);

    return this.sendResponse(
      req,
      res,
      "Token refreshed successfully",
      200,
      { accessToken, user },
    );
  }

  /**
   * Endpoint: GET /auth/sessions
   */
  public async getSessions(req: Request, res: Response) {
    const userId = (req as any).user?.sub || (req as any).user?.id;
    if (!userId) {
      throw new AuthenticationError("User not authenticated");
    }

    const sessions = await this.authService.getSessions(userId);
    return this.sendResponse(req, res, "Sessions retrieved successfully", 200, sessions);
  }

  /**
   * Endpoint: DELETE /auth/sessions/:id
   */
  public async revokeSession(req: Request, res: Response) {
    const userId = (req as any).user?.sub || (req as any).user?.id;
    if (!userId) {
      throw new AuthenticationError("User not authenticated");
    }

    const sessionId = req.params.id as string;
    const result = await this.authService.revokeSession(userId, sessionId);
    return this.sendResponse(req, res, result.message, 200);
  }

  /**
   * Endpoint: POST /auth/logout
   */
  public async logout(req: Request, res: Response) {
    const rawRefreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;
    const userId = (req as any).user?.sub || (req as any).user?.id;

    res.clearCookie("refreshToken", { path: "/auth" });

    const result = await this.authService.logout(rawRefreshToken, userId);
    return this.sendResponse(req, res, result.message, 200);
  }

  /**
   * Endpoint: POST /auth/forgot-password
   */
  public async forgotPassword(req: Request, res: Response) {
    const { email } = req.validatedBody as ForgotPasswordDTO;
    const result = await this.authService.forgotPassword(email);
    return this.sendResponse(req, res, result.message, 200, {
      resetToken: result.resetToken,
    });
  }

  /**
   * Endpoint: POST /auth/reset-password
   */
  public async resetPassword(req: Request, res: Response) {
    const { token, password } = req.validatedBody as ResetPasswordDTO;

    res.clearCookie("refreshToken", { path: "/auth" });

    const result = await this.authService.resetPassword(token, password);
    return this.sendResponse(req, res, result.message, 200);
  }

  /**
   * Helper to attach HttpOnly cookie for refresh token
   */
  private setRefreshCookie(res: Response, rawRefreshToken: string) {
    const days = env.REFRESH_TOKEN_EXPIRES_DAYS || 30;
    res.cookie("refreshToken", rawRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth",
      maxAge: days * 24 * 60 * 60 * 1000,
    });
  }
}
