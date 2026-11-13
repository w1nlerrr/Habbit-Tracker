import type { CookieOptions, Request, Response } from 'express';

import type { LoginInput, RegisterInput, UpdateProfileInput } from '@habit/shared';

import { config } from '../../config/index.js';
import { requireAuth } from '../../middleware/authenticate.js';
import { getBody } from '../../middleware/validate.js';
import { toUserDto } from './dto.js';
import { authService, type RequestMeta } from './service.js';

export const REFRESH_COOKIE_NAME = 'ht_refresh';

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
}

function clearCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'strict',
    path: '/api/v1/auth',
  };
}

function requestMeta(req: Request): RequestMeta {
  const userAgent = req.headers['user-agent'];
  return {
    ip: req.ip,
    ...(userAgent ? { userAgent: userAgent.slice(0, 255) } : {}),
  };
}

function readRefreshCookie(req: Request): string | undefined {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const value = cookies?.[REFRESH_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const input = getBody<RegisterInput>(req);
    const result = await authService.register(input, requestMeta(req));

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
    res.status(201).json({
      user: toUserDto(result.user),
      accessToken: result.accessToken,
      expiresInSec: result.expiresInSec,
    });
  },

  async login(req: Request, res: Response): Promise<void> {
    const input = getBody<LoginInput>(req);
    const result = await authService.login(input, requestMeta(req));

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
    res.status(200).json({
      user: toUserDto(result.user),
      accessToken: result.accessToken,
      expiresInSec: result.expiresInSec,
    });
  },

  async refresh(req: Request, res: Response): Promise<void> {
    const result = await authService.refresh(readRefreshCookie(req), requestMeta(req));

    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
    res.status(200).json({
      user: toUserDto(result.user),
      accessToken: result.accessToken,
      expiresInSec: result.expiresInSec,
    });
  },

  async logout(req: Request, res: Response): Promise<void> {
    await authService.logout(readRefreshCookie(req));
    res.clearCookie(REFRESH_COOKIE_NAME, clearCookieOptions());
    res.status(204).send();
  },

  async me(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const user = await authService.getProfile(userId);
    res.status(200).json({ user: toUserDto(user) });
  },

  async updateProfile(req: Request, res: Response): Promise<void> {
    const { userId } = requireAuth(req);
    const input = getBody<UpdateProfileInput>(req);
    const user = await authService.updateProfile(userId, input);
    res.status(200).json({ user: toUserDto(user) });
  },
};
