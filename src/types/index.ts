export type PatientType = "Normal" | "Senior Citizen" | "Emergency";
export type PatientStatus = "Waiting" | "In Queue" | "In Consultation" | "Completed" | "Skipped" | "Cancelled" | "Transferred";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "receptionist" | "admin";
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  room: string;
  available: boolean;
  currentWait?: string;
  patientsWaiting?: number;
  status?: string;
}

export interface Patient {
  id: string;
  token: string;
  name: string;
  phone: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  room: string;
  type: PatientType;
  status: PatientStatus;
  date: string;
  registeredAt: string;
  waitTime: string;
  totalAhead?: number;
  currentServing?: number | string;
  notes?: string;
  priority?: "Normal" | "Senior" | "Emergency" | "Senior Citizen"; // support both UI variants
  createdAt?: string;
}

export interface Room {
  id: string;
  name: string;
  doctorId: string;
  doctorName: string;
  capacity: number;
  occupancy: number;
  status: string;
  queue: string[]; // patient tokens
  patients?: Patient[]; // room patient objects if returned by GET /rooms
}

export interface ClinicConfig {
  avgConsultTime: string;
  tokenMethod: string;
  maxQueue: string;
  prioritySenior: boolean;
  priorityEmergency: boolean;
}

export interface NotificationSettings {
  browser: boolean;
  sms: boolean;
  queueAlerts: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface QueueStatusResponse {
  token: string;
  doctor: string;
  room: string;
  totalAhead: number;
  waitTime: string;
  status: "Waiting" | "In Queue" | "In Consultation" | "Completed" | "Cancelled" | "Transferred" | "Skipped";
  currentServing: number;
  update: string;
}

export interface HomeSummaryResponse {
  liveServingToken: string;
  room: string;
  doctor: string;
  stats: {
    clinicsCount: string;
    patientsCount: string;
    uptime: string;
  };
  queue: Array<{
    token: string;
    status: string;
  }>;
}

export interface KpiItem {
  label: string;
  value: string;
  trend: string;
  up: boolean;
}

export interface PeakHourData {
  hour: string;
  wait: number;
}

export interface DoctorLoadData {
  name: string;
  patients: number;
  completed: number;
}

export interface VolumeTrendData {
  day: string;
  patients: number;
}

export interface RoomUtilizationData {
  name: string;
  value: number;
  color?: string;
}
