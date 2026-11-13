import type {
  LoginInput,
  LoginResponse,
  RegisterInput,
  UpdateProfileInput,
  UserDto,
} from '@habit/shared';

import { apiRequest } from './http';

export const authApi = {
  login: (input: LoginInput) =>
    apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: input, auth: false }),

  register: (input: RegisterInput) =>
    apiRequest<LoginResponse>('/auth/register', { method: 'POST', body: input, auth: false }),

  refresh: () => apiRequest<LoginResponse>('/auth/refresh', { method: 'POST', auth: false }),

  logout: () => apiRequest<void>('/auth/logout', { method: 'POST', auth: false }),

  me: () => apiRequest<{ user: UserDto }>('/auth/me'),

  updateProfile: (input: UpdateProfileInput) =>
    apiRequest<{ user: UserDto }>('/auth/me', { method: 'PATCH', body: input }),
};
