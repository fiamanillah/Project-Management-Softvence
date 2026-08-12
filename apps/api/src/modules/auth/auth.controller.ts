import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { setAuthCookies, clearAuthCookies } from "./cookie.utils";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  public async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body || {};
      const result = await this.authService.login({
        email,
        password,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      setAuthCookies(res, result.accessToken, result.refreshToken);

      return res.status(200).json({
        success: true,
        data: {
          user: result.user,
        },
      });
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: error.message || "Invalid email or password",
        },
      });
    }
  }

  public async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refresh_token;
      const result = await this.authService.refresh(refreshToken, {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      setAuthCookies(res, result.accessToken, result.refreshToken);

      return res.status(200).json({
        success: true,
        message: "Token refreshed successfully",
      });
    } catch (error: any) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: error.message || "Invalid refresh token",
        },
      });
    }
  }

  public async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refresh_token;
      const userId = req.user?.id;

      await this.authService.logout(refreshToken, userId, {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      clearAuthCookies(res);

      return res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      clearAuthCookies(res);
      return next(error);
    }
  }

  public async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await this.authService.getMe(req.user!.id);
      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      return next(error);
    }
  }

  public async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { currentPassword, newPassword } = req.body || {};
      await this.authService.changePassword(
        req.user!.id,
        currentPassword,
        newPassword,
        {
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        }
      );

      return res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: error.message,
        },
      });
    }
  }

  public async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body || {};
      const result = await this.authService.forgotPassword(email, {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      return res.status(200).json({
        success: true,
        message:
          "If an account exists with this email address, password reset instructions have been sent.",
      });
    }
  }

  public async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body || {};
      await this.authService.resetPassword(token, newPassword, {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.status(200).json({
        success: true,
        message: "Password reset successfully. Please log in with your new password.",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: error.message || "Failed to reset password",
        },
      });
    }
  }

  public async acceptInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body || {};
      await this.authService.acceptInvite(token, password, {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return res.status(200).json({
        success: true,
        message: "Account activated successfully. You can now log in.",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: error.message || "Failed to accept invite",
        },
      });
    }
  }
}
