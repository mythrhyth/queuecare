import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../utils/db";
import { mapRoom, mapPatient } from "../utils/mappers";
import { getDoctorAveragesMap } from "../utils/waitTimes";
import { autoPromoteAllDoctors } from "./queue.routes";
const router = Router();

// GET /rooms
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const io = req.app.get("io");
    await autoPromoteAllDoctors(io);
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

    const mapped = rooms.map(r => mapRoom(r, config, allActivePatients, docAverages));
    return res.json(mapped);
  } catch (error) {
    next(error);
  }
});

// GET /rooms/:id/queue
router.get("/:id/queue", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const io = req.app.get("io");
    await autoPromoteAllDoctors(io);
    const todayStr = new Date().toISOString().split("T")[0];

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const patients = await prisma.patient.findMany({
      where: {
        roomId: id,
        date: todayStr,
        status: { in: ["Waiting", "In Queue", "In Consultation"] }
      },
      include: {
        doctor: true,
        room: true
      },
      orderBy: { position: "asc" }
    });

    const config = await prisma.clinicConfig.findUnique({ where: { id: "default" } }) || { avgConsultTime: "15" } as any;
    const defaultAvg = Number(config.avgConsultTime) || 15;
    const docAverages = await getDoctorAveragesMap(prisma, defaultAvg);

    const mapped = patients.map(p => mapPatient(p, config, patients, docAverages));
    return res.json(mapped);
  } catch (error) {
    next(error);
  }
});

// PUT /rooms/:id
router.put("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { queue } = req.body; // array of patient token strings

    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    if (queue && Array.isArray(queue)) {
      // Reorder patient positions to match index in queue array
      for (let i = 0; i < queue.length; i++) {
        const token = queue[i];
        await prisma.patient.updateMany({
          where: {
            token,
            roomId: id,
            date: todayStr
          },
          data: { position: i }
        });
      }
    }

    // Load full room info to return
    const updatedRoom = await prisma.room.findUnique({
      where: { id },
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

    const result = mapRoom(updatedRoom!, config, allActivePatients, docAverages);

    // Emit Socket notification
    const io = req.app.get("io");
    await autoPromoteAllDoctors(io);
    if (io) {
      console.log(`Broadcasting rooms:updated for room ${room.name}`);
      io.emit("rooms:updated", {});
      io.emit("queue-updated", {});
      io.emit("wait-time-updated", {});
    }

    return res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
