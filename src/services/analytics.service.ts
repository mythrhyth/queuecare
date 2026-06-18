import { api } from "./api";
import { KpiItem, PeakHourData, DoctorLoadData, VolumeTrendData, RoomUtilizationData } from "../types";

export const analyticsService = {
  async getKpis(): Promise<KpiItem[]> {
    const response = await api.get<KpiItem[]>("/analytics/kpis");
    return response.data;
  },

  async getPeakHours(): Promise<PeakHourData[]> {
    const response = await api.get<PeakHourData[]>("/analytics/peak-hours");
    return response.data;
  },

  async getDoctorLoad(): Promise<DoctorLoadData[]> {
    const response = await api.get<DoctorLoadData[]>("/analytics/doctor-load");
    return response.data;
  },

  async getVolumeTrend(): Promise<VolumeTrendData[]> {
    const response = await api.get<VolumeTrendData[]>("/analytics/volume-trend");
    return response.data;
  },

  async getRoomUtilization(): Promise<RoomUtilizationData[]> {
    const response = await api.get<RoomUtilizationData[]>("/analytics/room-utilization");
    return response.data;
  },
};
