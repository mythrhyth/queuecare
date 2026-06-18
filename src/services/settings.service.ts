import { api } from "./api";
import { ClinicConfig, NotificationSettings, Doctor, Room } from "../types";

export const settingsService = {
  async getClinicConfig(): Promise<ClinicConfig> {
    const response = await api.get<ClinicConfig>("/settings/clinic");
    return response.data;
  },

  async updateClinicConfig(payload: ClinicConfig): Promise<ClinicConfig> {
    const response = await api.put<ClinicConfig>("/settings/clinic", payload);
    return response.data;
  },

  async getNotificationSettings(): Promise<NotificationSettings> {
    const response = await api.get<NotificationSettings>("/settings/notifications");
    return response.data;
  },

  async updateNotificationSettings(payload: NotificationSettings): Promise<NotificationSettings> {
    const response = await api.put<NotificationSettings>("/settings/notifications", payload);
    return response.data;
  },

  async getDoctors(): Promise<Doctor[]> {
    const response = await api.get<Doctor[]>("/settings/doctors");
    return response.data;
  },

  async updateDoctors(payload: Doctor[]): Promise<Doctor[]> {
    const response = await api.put<Doctor[]>("/settings/doctors", payload);
    return response.data;
  },

  async getRooms(): Promise<Room[]> {
    const response = await api.get<Room[]>("/settings/rooms");
    return response.data;
  },

  async updateRooms(payload: Room[]): Promise<Room[]> {
    const response = await api.put<Room[]>("/settings/rooms", payload);
    return response.data;
  },
};
