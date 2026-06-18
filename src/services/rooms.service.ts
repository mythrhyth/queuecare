import { api } from "./api";
import { Room, Patient } from "../types";

export const roomsService = {
  async getRooms(): Promise<Room[]> {
    const response = await api.get<Room[]>("/rooms");
    return response.data;
  },

  async getRoomQueue(id: string): Promise<Patient[]> {
    const response = await api.get<Patient[]>(`/rooms/${id}/queue`);
    return response.data;
  },

  async updateRoom(id: string, payload: Partial<Room>): Promise<Room> {
    const response = await api.put<Room>(`/rooms/${id}`, payload);
    return response.data;
  },
};
