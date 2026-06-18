import { api } from "./api";
import { Patient, PatientStatus, QueueStatusResponse } from "../types";

export interface TransferPayload {
  doctorId?: string;
  room?: string;
}

export const queueService = {
  async getLiveQueue(): Promise<Patient[]> {
    const response = await api.get<Patient[]>("/queue/live");
    return response.data;
  },

  async getQueueStatus(token: string): Promise<QueueStatusResponse> {
    const response = await api.get<QueueStatusResponse>(`/queue/${token}`);
    return response.data;
  },

  async updateStatus(token: string, status: PatientStatus): Promise<Patient> {
    const response = await api.put<Patient>(`/queue/${token}/status`, { status });
    return response.data;
  },

  async transferPatient(token: string, payload: TransferPayload): Promise<Patient> {
    const response = await api.put<Patient>(`/queue/${token}/transfer`, payload);
    return response.data;
  },
};
