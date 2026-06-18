import { api } from "./api";
import { HomeSummaryResponse, Doctor } from "../types";

export const homeService = {
  async getHomeSummary(): Promise<HomeSummaryResponse> {
    const response = await api.get<HomeSummaryResponse>("/home/summary");
    return response.data;
  },

  async getHomeDoctors(): Promise<Doctor[]> {
    const response = await api.get<Doctor[]>("/home/doctors");
    return response.data;
  },
};
