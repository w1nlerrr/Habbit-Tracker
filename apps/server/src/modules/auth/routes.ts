import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { loginSchema, registerSchema, updateProfileSchema } from '@habit/shared';

import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import { authController } from './controller.js';

export const authRouter = Router();

/** Защита от перебора паролей: 20 попыток за 15 минут на IP. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Слишком много попыток. Повторите позже.',
    },
  },
});

authRouter.post('/register', authLimiter, validate({ body: registerSchema }), authController.register);
authRouter.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', authController.logout);

authRouter.get('/me', authenticate, authController.me);
authRouter.patch('/me', authenticate, validate({ body: updateProfileSchema }), authController.updateProfile);
