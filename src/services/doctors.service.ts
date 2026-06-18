import { api } from "./api";
import { Doctor } from "../types";

export const doctorsService = {
  async getDoctors(): Promise<Doctor[]> {
    const response = await api.get<Doctor[]>("/doctors");
    return response.data;
  },

  async getDoctor(id: string): Promise<Doctor> {
    const response = await api.get<Doctor>(`/doctors/${id}`);
    return response.data;
  },

  async createDoctor(payload: Omit<Doctor, "id">): Promise<Doctor> {
    const response = await api.post<Doctor>("/doctors", payload);
    return response.data;
  },

  async updateDoctor(id: string, payload: Partial<Doctor>): Promise<Doctor> {
    const response = await api.put<Doctor>(`/doctors/${id}`, payload);
    return response.data;
  },

  async deleteDoctor(id: string): Promise<void> {
    await api.delete(`/doctors/${id}`);
  },
};
