import authService from "@/services/auth.service";
import emailService from "@/services/email.service";
import tokenService from "@/services/token.service";
import userService from "@/services/user.service";
import { ApiError } from "@/utils";
import { hashPassword } from "@/utils/passwordUtils";
import type { Request, RequestHandler, Response } from "express";
import httpStatus from "http-status";

const register: RequestHandler = async (req: Request, res: Response) => {
  const payload = req.body;

  const existingUser = await userService.getUserByEmail(payload.email);
  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email is already taken");
  }

  const hashedPassword = await hashPassword(payload.password);
  const user = await userService.createUser({ ...payload, password: hashedPassword });

  res.status(httpStatus.CREATED).send(user);
};

const login: RequestHandler = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password);
  const token = await tokenService.generateAuthTokens(user);
  res.send({ user, token });
};

const forgotPassword: RequestHandler = async (req: Request, res: Response) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
};

const resetPassword: RequestHandler = async (req: Request, res: Response) => {
  const { token } = req.query;

  await authService.resetPassword(token as string, req.body.password);
  res.status(httpStatus.OK).send({ success: true, message: "Password Reset Successfully!" });
};

const sendVerificationEmail: RequestHandler = async (req: Request, res: Response) => {
  const user = req.user!;
  const { email, isEmailVerified } = user;

  if (isEmailVerified) {
    res.status(httpStatus.BAD_REQUEST).send({
      success: false,
      message: `Email: ${email} is already activated!`,
    });
  }

  const verifyEmailToken = await tokenService.generateVerifyEmailToken(user);
  await emailService.sendVerificationEmail(user.email, verifyEmailToken);

  res.status(httpStatus.OK).send({
    success: true,
    message: `Email sent to ${email} successfully!`,
  });
};

const verifyEmail: RequestHandler = async (req: Request, res: Response) => {
  await authService.verifyEmail(req.query.token as string);
  res.status(httpStatus.OK).send({
    success: true,
    message: "Email: Verified successfully!",
  });
};

export default {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyEmail,
  sendVerificationEmail,
};
