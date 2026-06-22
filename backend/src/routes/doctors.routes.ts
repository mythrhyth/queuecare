import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { mapDoctor } from "../utils/mappers";
import { autoPromoteAllDoctors, handleDoctorRoomChange, broadcastQueueUpdate } from "./queue.routes";

const prisma = new PrismaClient();
const router = Router();

// GET /doctors
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];

    const doctors = await prisma.doctor.findMany({
      include: {
        room: true,
        patients: {
          where: { date: todayStr }
        }
      }
    });

    const config = await prisma.clinicConfig.findUnique({ where: { id: "default" } }) || { avgConsultTime: "15" } as any;

    const mapped = doctors.map(d => mapDoctor(d, config));
    return res.json(mapped);
  } catch (error) {
    next(error);
  }
});

// GET /doctors/:id
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const todayStr = new Date().toISOString().split("T")[0];

    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: {
        room: true,
        patients: {
          where: { date: todayStr }
        }
      }
    });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const config = await prisma.clinicConfig.findUnique({ where: { id: "default" } }) || { avgConsultTime: "15" } as any;

    return res.json(mapDoctor(doctor, config));
  } catch (error) {
    next(error);
  }
});

// POST /doctors
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, specialty, room, available } = req.body;

    if (!name || !specialty) {
      return res.status(400).json({ message: "Name and specialty are required" });
    }

    // Resolve room by name
    let roomId = null;
    if (room) {
      const roomRecord = await prisma.room.findUnique({ where: { name: room } });
      if (roomRecord) {
        roomId = roomRecord.id;
      } else {
        // Create room if it doesn't exist
        const newRoom = await prisma.room.create({
          data: { name: room, capacity: 20, status: "Available" }
        });
        roomId = newRoom.id;
      }
    }

    const doctor = await prisma.doctor.create({
      data: {
        name,
        specialty,
        available: available !== undefined ? available : true,
        status: available !== false ? "Available" : "Off Duty",
        roomId
      },
      include: { room: true }
    });

    const config = await prisma.clinicConfig.findUnique({ where: { id: "default" } }) || { avgConsultTime: "15" } as any;

    // Trigger socket broadcast
    const io = req.app.get("io");
    await autoPromoteAllDoctors(io);
    if (io) {
      io.emit("doctors:updated", {});
      io.emit("doctor-status-updated", {});
      broadcastQueueUpdate(io);
    }

    return res.status(201).json(mapDoctor({ ...doctor, patients: [] }, config));
  } catch (error) {
    next(error);
  }
});

// PUT /doctors/:id
router.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, specialty, room, available, status } = req.body;

    const existingDoctor = await prisma.doctor.findUnique({ where: { id } });
    if (!existingDoctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    const fullDoctor = await prisma.$transaction(async (tx) => {
      // 1. Resolve room by name if specified
      let resolvedRoomId = existingDoctor.roomId;
      if (room) {
        const roomRecord = await tx.room.findUnique({ where: { name: room } });
        if (roomRecord) {
          resolvedRoomId = roomRecord.id;
        } else {
          const newRoom = await tx.room.create({
            data: { name: room, capacity: 20, status: "Available" }
          });
          resolvedRoomId = newRoom.id;
        }
      }

      // 2. Update the doctor
      await tx.doctor.update({
        where: { id },
        data: {
          name: name !== undefined ? name : existingDoctor.name,
          specialty: specialty !== undefined ? specialty : existingDoctor.specialty,
          available: available !== undefined ? available : existingDoctor.available,
          status: status !== undefined ? status : (available === false ? "Off Duty" : "Available"),
          roomId: resolvedRoomId
        }
      });

      // 3. Cascade room changes to today's active patients
      await handleDoctorRoomChange(tx, id, existingDoctor.roomId, resolvedRoomId, todayStr);

      // 4. Return full doctor details
      return await tx.doctor.findUnique({
        where: { id },
        include: {
          room: true,
          patients: {
            where: { date: todayStr }
          }
        }
      });
    });

    const config = await prisma.clinicConfig.findUnique({ where: { id: "default" } }) || { avgConsultTime: "15" } as any;

    // Trigger socket broadcast
    const io = req.app.get("io");
    await autoPromoteAllDoctors(io);
    if (io) {
      io.emit("doctors:updated", {});
      io.emit("doctor-status-updated", {});
      broadcastQueueUpdate(io);
    }

    return res.json(mapDoctor(fullDoctor!, config));
  } catch (error) {
    next(error);
  }
});

// DELETE /doctors/:id
router.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await prisma.doctor.delete({ where: { id } });

    // Trigger socket broadcast
    const io = req.app.get("io");
    await autoPromoteAllDoctors(io);
    if (io) {
      io.emit("doctors:updated", {});
      io.emit("doctor-status-updated", {});
      broadcastQueueUpdate(io);
    }

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
