import { api } from "./api";
import { Patient, PatientStatus, PatientType } from "../types";

export interface GetPatientsParams {
  status?: PatientStatus | "All";
  type?: PatientType | "All";
  search?: string;
  date?: string;
  fromDate?: string;
  toDate?: string;
}

export interface RegisterPatientPayload {
  name: string;
  phone: string;
  doctorId: string;
  priority: string;
}

export const patientsService = {
  async getPatients(params?: GetPatientsParams): Promise<Patient[]> {
    const queryParams: Record<string, string> = {};
    if (params) {
      if (params.status && params.status !== "All") queryParams.status = params.status;
      if (params.type && params.type !== "All") queryParams.type = params.type;
      if (params.search) queryParams.search = params.search;
      if (params.date) queryParams.date = params.date;
      if (params.fromDate) queryParams.fromDate = params.fromDate;
      if (params.toDate) queryParams.toDate = params.toDate;
    }
    const response = await api.get<Patient[]>("/patients", { params: queryParams });
    return response.data;
  },

  async registerPatient(payload: RegisterPatientPayload): Promise<Patient> {
    const response = await api.post<Patient>("/patients", payload);
    return response.data;
  },
};
