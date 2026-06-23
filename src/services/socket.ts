import { io, Socket } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Helper to strip subpath (like /api) from connection string to avoid "Invalid namespace" error in Socket.IO
const getSocketUrl = (apiUrl: string): string => {
  try {
    const url = new URL(apiUrl);
    return url.origin;
  } catch {
    return "http://localhost:5000";
  }
};

class SocketService {
  private socket: Socket | null = null;
  private statusListeners: Array<(connected: boolean) => void> = [];

  getStatus(): boolean {
    return this.socket?.connected || false;
  }

  onStatusChange(callback: (connected: boolean) => void): () => void {
    this.statusListeners.push(callback);
    // Trigger immediately with current status
    callback(this.getStatus());
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach(cb => cb(connected));
  }

  connect() {
    const token = localStorage.getItem("qc_token");
    
    // If socket already exists, adjust auth credentials and reconnect
    if (this.socket) {
      this.socket.auth = { token: token ? `Bearer ${token}` : "" };
      if (!this.socket.connected) {
        this.socket.connect();
      }
      return;
    }

    const socketUrl = getSocketUrl(API_URL);
    console.log(`Initializing Socket.IO connection to: ${socketUrl}`);

    this.socket = io(socketUrl, {
      auth: {
        token: token ? `Bearer ${token}` : "",
      },
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity, // keep attempting to reconnect indefinitely
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected successfully:", this.socket?.id);
      this.notifyStatus(true);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      this.notifyStatus(false);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
      this.notifyStatus(false);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  emit(event: string, data: any) {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.emit(event, data);
  }
}

export const socketService = new SocketService();
export default socketService;
