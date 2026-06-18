import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { mapDoctor, mapRoom } from "../utils/mappers";
import { getDoctorAveragesMap } from "../utils/waitTimes";
import { autoPromoteAllDoctors } from "./queue.routes";

const prisma = new PrismaClient();
const router = Router();

// GET /settings/clinic
router.get("/clinic", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = await prisma.clinicConfig.findUnique({ where: { id: "default" } });
    return res.json(config);
  } catch (error) {
    next(error);
  }
});

// PUT /settings/clinic
router.put("/clinic", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { avgConsultTime, tokenMethod, maxQueue, prioritySenior, priorityEmergency } = req.body;

    const updated = await prisma.clinicConfig.upsert({
      where: { id: "default" },
      update: {
        avgConsultTime: String(avgConsultTime),
        tokenMethod,
        maxQueue: String(maxQueue),
        prioritySenior: Boolean(prioritySenior),
        priorityEmergency: Boolean(priorityEmergency)
      },
      create: {
        id: "default",
        avgConsultTime: String(avgConsultTime),
        tokenMethod,
        maxQueue: String(maxQueue),
        prioritySenior: Boolean(prioritySenior),
        priorityEmergency: Boolean(priorityEmergency)
      }
    });

    const io = req.app.get("io");
    if (io) io.emit("settings:updated", {});

    return res.json(updated);
  } catch (error) {
    next(error);
  }
});

// GET /settings/notifications
router.get("/notifications", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.notificationSettings.findUnique({ where: { id: "default" } });
    return res.json(settings);
  } catch (error) {
    next(error);
  }
});

// PUT /settings/notifications
router.put("/notifications", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { browser, sms, queueAlerts } = req.body;

    const updated = await prisma.notificationSettings.upsert({
      where: { id: "default" },
      update: {
        browser: Boolean(browser),
        sms: Boolean(sms),
        queueAlerts: Boolean(queueAlerts)
      },
      create: {
        id: "default",
        browser: Boolean(browser),
        sms: Boolean(sms),
        queueAlerts: Boolean(queueAlerts)
      }
    });

    const io = req.app.get("io");
    if (io) io.emit("settings:updated", {});

    return res.json(updated);
  } catch (error) {
    next(error);
  }
});

// GET /settings/doctors
router.get("/doctors", async (req: Request, res: Response, next: NextFunction) => {
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

    return res.json(doctors.map(d => mapDoctor(d, config)));
  } catch (error) {
    next(error);
  }
});

// PUT /settings/doctors (reconciles bulk list from SettingsPage)
router.put("/doctors", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body; // Doctor[]

    if (!Array.isArray(payload)) {
      return res.status(400).json({ message: "Payload must be an array of doctors" });
    }

    const incomingIds = payload.map((d: any) => d.id).filter(id => id && !id.includes("."));
    const rooms = await prisma.room.findMany();

    // 1. Delete doctors not present in payload
    await prisma.doctor.deleteMany({
      where: {
        id: { notIn: incomingIds }
      }
    });

    // 2. Insert or update doctors in payload
    for (const doc of payload) {
      const roomName = doc.room; // Room name string, e.g. "Room 2"
      let roomId = null;

      if (roomName) {
        let roomRecord = rooms.find(r => r.name === roomName);
        if (!roomRecord) {
          roomRecord = await prisma.room.create({
            data: { name: roomName, capacity: 20, status: "Available" }
          });
          rooms.push(roomRecord);
        }
        roomId = roomRecord.id;
      }

      // Check if it's a valid database UUID or timestamp id
      const existing = await prisma.doctor.findFirst({
        where: {
          OR: [
            { id: doc.id },
            { name: doc.name }
          ]
        }
      });

      if (existing) {
        await prisma.doctor.update({
          where: { id: existing.id },
          data: {
            name: doc.name,
            specialty: doc.specialty,
            available: doc.available,
            roomId
          }
        });
      } else {
        await prisma.doctor.create({
          data: {
            name: doc.name,
            specialty: doc.specialty,
            available: doc.available,
            roomId
          }
        });
      }
    }

    const io = req.app.get("io");
    await autoPromoteAllDoctors(io);

    // Return the updated doctors list
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

    if (io) {
      io.emit("doctors:updated", {});
      io.emit("doctor-status-updated", {});
    }

    return res.json(doctors.map(d => mapDoctor(d, config)));
  } catch (error) {
    next(error);
  }
});

// GET /settings/rooms
router.get("/rooms", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const rooms = await prisma.room.findMany({
      include: {
        doctors: {
          include: {
            patients: {
              where: { date: todayStr }
            }
          }
        },
        patients: {
          where: { date: todayStr }
        }
      }
    });

    const allActivePatients = await prisma.patient.findMany({
      where: {
        date: todayStr,
        status: { in: ["Waiting", "In Queue", "In Consultation"] }
      }
    });

    const config = await prisma.clinicConfig.findUnique({ where: { id: "default" } }) || { avgConsultTime: "15" } as any;
    const defaultAvg = Number(config.avgConsultTime) || 15;
    const docAverages = await getDoctorAveragesMap(prisma, defaultAvg);

    return res.json(rooms.map(r => mapRoom(r, config, allActivePatients, docAverages)));
  } catch (error) {
    next(error);
  }
});

// PUT /settings/rooms (reconciles bulk list from SettingsPage)
router.put("/rooms", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body; // Room[]

    if (!Array.isArray(payload)) {
      return res.status(400).json({ message: "Payload must be an array of rooms" });
    }

    const incomingIds = payload.map((r: any) => r.id).filter(id => id && !id.includes("."));

    // 1. Delete rooms not in incoming list
    await prisma.room.deleteMany({
      where: {
        id: { notIn: incomingIds }
      }
    });

    // 2. Insert or update rooms in payload
    for (const r of payload) {
      const existing = await prisma.room.findFirst({
        where: {
          OR: [
            { id: r.id },
            { name: r.name }
          ]
        }
      });

      let roomId = "";
      if (existing) {
        const updated = await prisma.room.update({
          where: { id: existing.id },
          data: {
            name: r.name,
            capacity: Number(r.capacity) || 20,
            status: r.status || "Available"
          }
        });
        roomId = updated.id;
      } else {
        const created = await prisma.room.create({
          data: {
            name: r.name,
            capacity: Number(r.capacity) || 20,
            status: r.status || "Available"
          }
        });
        roomId = created.id;
      }

      // Re-link doctor assigned by name
      const docName = r.doctorName || r.doctor;
      if (docName && roomId) {
        const doctor = await prisma.doctor.findFirst({ where: { name: docName } });
        if (doctor) {
          await prisma.doctor.update({
            where: { id: doctor.id },
            data: { roomId }
          });
        }
      }
    }

    // Return the updated rooms list
    const todayStr = new Date().toISOString().split("T")[0];
    const rooms = await prisma.room.findMany({
      include: {
        doctors: {
          include: {
            patients: {
              where: { date: todayStr }
            }
          }
        },
        patients: {
          where: { date: todayStr }
        }
      }
    });

    const allActivePatients = await prisma.patient.findMany({
      where: {
        date: todayStr,
        status: { in: ["Waiting", "In Queue", "In Consultation"] }
      }
    });

    const config = await prisma.clinicConfig.findUnique({ where: { id: "default" } }) || { avgConsultTime: "15" } as any;
    const defaultAvg = Number(config.avgConsultTime) || 15;
    const docAverages = await getDoctorAveragesMap(prisma, defaultAvg);

    const io = req.app.get("io");
    await autoPromoteAllDoctors(io);
    if (io) io.emit("rooms:updated", {});

    return res.json(rooms.map(r => mapRoom(r, config, allActivePatients, docAverages)));
  } catch (error) {
    next(error);
  }
});

export default router;
