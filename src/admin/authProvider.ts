import { AuthProvider } from '@refinedev/core';
import { apiRequest } from './api';

const TOKEN_KEY = 'APP_TOKEN';
const USER_KEY = 'APP_USER';
const ROLE_KEY = 'APP_ROLE';

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.ok) {
        localStorage.setItem(TOKEN_KEY, data.data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
        localStorage.setItem(ROLE_KEY, data.data.user.role);
        return { success: true, redirectTo: false };
      }
      
      return Promise.reject(new Error(data.error || '用户名或密码不正确'));
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error('网络连接错误'));
    }
  },
  logout: async () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLE_KEY);
    return { success: true, redirectTo: false };
  },
  check: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      return { authenticated: true };
    }
    return { authenticated: false, logout: true, redirectTo: false };
  },
  getPermissions: async () => {
    return localStorage.getItem(ROLE_KEY);
  },
  getIdentity: async () => {
    const user = localStorage.getItem(USER_KEY);
    if (user) {
      return JSON.parse(user);
    }
    return null;
  },
  onError: async (error) => {
    if (error.status === 401 || error.status === 403) {
      return { logout: true, redirectTo: false };
    }
    return {};
  },
};
