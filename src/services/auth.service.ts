import { api } from "./api";
import { AuthResponse, User } from "../types";

export const authService = {
  async login(credentials: Record<string, string>): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>("/auth/login", credentials);
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.warn("Failed to notify backend of logout:", error);
    }
  },

  async getMe(): Promise<{ user: User }> {
    const response = await api.get<{ user: User }>("/auth/me");
    return response.data;
  },
};
