import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes";
import patientRoutes from "./routes/patients.routes";
import queueRoutes from "./routes/queue.routes";
import doctorRoutes from "./routes/doctors.routes";
import roomRoutes from "./routes/rooms.routes";
import analyticsRoutes from "./routes/analytics.routes";
import settingsRoutes from "./routes/settings.routes";
import homeRoutes from "./routes/home.routes";
import { errorMiddleware } from "./middleware/error.middleware";

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json());

// API Health Check
app.get("/health", (req, res) => {
  res.json({ status: "OK", time: new Date() });
});

app.get("/api/info", (req, res) => {
  res.json({ name: "QueueCare API", version: "1.0.0" });
});

// Mount routes under /api
app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/home", homeRoutes);

// Global Error Handler
app.use(errorMiddleware);

export default app;
