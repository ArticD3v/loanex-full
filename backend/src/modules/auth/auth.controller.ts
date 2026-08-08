import { Request, Response } from 'express';
import { sendSuccess } from '../../common/utils/api-response';
import {
  AdminLoginBody,
  ChangePasswordBody,
  CompleteRegistrationBody,
  ForgotPasswordBody,
  LoginBody,
  LogoutBody,
  RefreshTokenBody,
  RegisterBody,
  ResetPasswordBody,
  SendOtpBody,
  VerifyOtpBody,
} from './auth.dto';
import { authService } from './auth.service';

import type { AuthenticatedRequest } from '../../common/middleware/authenticate';

export class AuthController {
  getMe = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).user!.sub;
    const data = await authService.getMe(userId);
    sendSuccess(res, data, 'User profile fetched');
  };
  register = async (req: Request, res: Response): Promise<void> => {
    const data = await authService.register(req.body as RegisterBody);
    sendSuccess(res, data, data.message, 201);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const data = await authService.login(req.body as LoginBody);
    sendSuccess(res, data, data.message);
  };

  adminLogin = async (req: Request, res: Response): Promise<void> => {
    const data = await authService.adminLogin(req.body as AdminLoginBody, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    sendSuccess(res, data, data.message);
  };

  sendOtp = async (req: Request, res: Response): Promise<void> => {
    const data = await authService.sendOtp(req.body as SendOtpBody);
    sendSuccess(res, data, data.message);
  };

  verifyOtp = async (req: Request, res: Response): Promise<void> => {
    const data = await authService.verifyOtp(req.body as VerifyOtpBody);
    sendSuccess(res, data, data.message);
  };

  completeRegistration = async (req: Request, res: Response): Promise<void> => {
    const data = await authService.completeRegistration(
      req.body as CompleteRegistrationBody,
    );
    sendSuccess(res, data, data.message, 201);
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const data = await authService.forgotPassword(req.body as ForgotPasswordBody);
    sendSuccess(res, data, data.message);
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const data = await authService.resetPassword(req.body as ResetPasswordBody);
    sendSuccess(res, data, data.message);
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as AuthenticatedRequest).user!.sub;
    const data = await authService.changePassword(
      userId,
      req.body as ChangePasswordBody,
    );
    sendSuccess(res, data, data.message);
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    const data = await authService.refreshToken(req.body as RefreshTokenBody);
    sendSuccess(res, data, data.message);
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const data = await authService.logout(req.body as LogoutBody);
    sendSuccess(res, data, data.message);
  };
}

export const authController = new AuthController();
