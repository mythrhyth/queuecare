import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../utils/db";
import { mapPatient } from "../utils/mappers";
import { getDoctorAveragesMap } from "../utils/waitTimes";
import { promoteNextPatient, autoPromoteAllDoctors, broadcastQueueUpdate } from "./queue.routes";
const router = Router();

// GET /patients
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const io = req.app.get("io");
    await autoPromoteAllDoctors(io);

    const { status, type, search, date, fromDate, toDate } = req.query;

    const todayStr = new Date().toISOString().split("T")[0];

    // Build Prisma query filters
    const where: any = {};

    if (fromDate && toDate) {
      where.date = {
        gte: fromDate as string,
        lte: toDate as string
      };
    } else if (date && date !== "all") {
      where.date = date as string;
    } else if (date !== "all") {
      where.date = todayStr;
    }

    if (status && status !== "All") {
      where.status = status as string;
    }

    if (type && type !== "All") {
      where.type = type as string;
    }

    if (search) {
      const searchStr = search as string;
      where.OR = [
        { name: { contains: searchStr } },
        { token: { contains: searchStr } },
        { phone: { contains: searchStr } }
      ];
    }

    const patients = await prisma.patient.findMany({
      where,
      include: {
        doctor: true,
        room: true
      },
      orderBy: [
        { createdAt: "desc" }
      ]
    });

    // We also need all active patients in the same rooms on the same days to compute wait times/ahead counts
    const patientDates = Array.from(new Set(patients.map(p => p.date)));
    const allPatientsToday = await prisma.patient.findMany({
      where: {
        date: { in: patientDates }
      }
    });

    const config = await prisma.clinicConfig.findUnique({ where: { id: "default" } }) || { avgConsultTime: "15" } as any;
    const defaultAvg = Number(config.avgConsultTime) || 15;
    const docAverages = await getDoctorAveragesMap(prisma, defaultAvg);

    const mapped = patients.map(p => {
      const roomPatients = allPatientsToday.filter(x => x.roomId === p.roomId && x.date === p.date);
      return mapPatient(p, config, roomPatients, docAverages);
    });

    return res.json(mapped);
  } catch (error) {
    next(error);
  }
});

// Helper for priority scoring
function getPriorityWeight(pri: string) {
  if (pri === "Emergency") return 3;
  if (pri === "Senior Citizen" || pri === "Senior") return 2;
  return 1;
}

// POST /patients
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, phone, doctorId, priority } = req.body;

    if (!name || !phone || !doctorId) {
      return res.status(400).json({ message: "Name, phone, and doctorId are required" });
    }

    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: { room: true }
    });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    const roomId = doctor.roomId;
    if (!roomId) {
      return res.status(400).json({ message: "Doctor is not assigned to any room" });
    }

    const config = await prisma.clinicConfig.findUnique({ where: { id: "default" } }) || {
      tokenMethod: "sequential",
      avgConsultTime: "15"
    } as any;

    const todayStr = new Date().toISOString().split("T")[0];

    // Check if token limit or max queue is exceeded
    const activeQueueCount = await prisma.patient.count({
      where: {
        date: todayStr,
        status: { in: ["Waiting", "In Queue", "In Consultation"] }
      }
    });

    if (activeQueueCount >= Number(config.maxQueue || 50)) {
      return res.status(400).json({ message: "Queue limit exceeded for today" });
    }

    // Determine priority and type
    const finalPriority = priority || "Normal";
    const finalType = (finalPriority === "Senior Citizen" || finalPriority === "Senior") ? "Senior Citizen" : finalPriority;

    // Format local registered time (e.g. 11:57 AM)
    const localTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });

    let promotedPatient: any = null;
    let newPatient: any = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        newPatient = await prisma.$transaction(async (tx) => {
          // 0. Generate Token inside transaction to prevent unique constraint race conditions
          let token = "";
          const existingPatientsToday = await tx.patient.findMany({
            where: { date: todayStr }
          });

          if (config.tokenMethod === "random") {
            // Random 4-digit unique token
            let rAttempts = 0;
            while (rAttempts < 100) {
              const rand = Math.floor(1000 + Math.random() * 9000).toString();
              const exists = await tx.patient.findUnique({ where: { token: rand } });
              if (!exists) {
                token = rand;
                break;
              }
              rAttempts++;
            }
            if (!token) token = Math.floor(1000 + Math.random() * 9000).toString();
          } else if (config.tokenMethod === "alphabetic") {
            // Prefix by priority, e.g. E-001, S-001, N-001
            let prefix = "T";
            if (priority === "Emergency") prefix = "E";
            else if (priority === "Senior Citizen" || priority === "Senior") prefix = "S";
            else prefix = "N";

            const allSamePrefixTokens = await tx.patient.findMany({
              where: {
                token: { startsWith: `${prefix}-` }
              },
              select: { token: true }
            });
            const nums = allSamePrefixTokens.map((p: any) => {
              const num = parseInt(p.token.split("-")[1]);
              return isNaN(num) ? 0 : num;
            });
            const maxNum = nums.length > 0 ? Math.max(...nums) : 0;
            token = `${prefix}-${String(maxNum + 1).padStart(3, "0")}`;
          } else {
            // Sequential token: T-001, T-002, etc.
            const allSequentialTokens = await tx.patient.findMany({
              where: {
                token: { startsWith: "T-" }
              },
              select: { token: true }
            });
            const sequentialTokens = allSequentialTokens.map((p: any) => {
              const num = parseInt(p.token.split("-")[1]);
              return isNaN(num) ? 0 : num;
            });
            const maxNum = sequentialTokens.length > 0 ? Math.max(...sequentialTokens) : 0;
            token = `T-${String(maxNum + 1).padStart(3, "0")}`;
          }

          // 1. Get all active patients in this room today, sorted by position
          const activeRoomPatients = await tx.patient.findMany({
            where: {
              roomId,
              date: todayStr,
              status: { in: ["Waiting", "In Queue", "In Consultation"] }
            },
            orderBy: { position: "asc" }
          });

          // 2. Find insert index based on priority weights
          let insertIdx = activeRoomPatients.length;
          const newPriorityVal = getPriorityWeight(finalPriority);

          for (let i = 0; i < activeRoomPatients.length; i++) {
            const p = activeRoomPatients[i];
            if (p.status === "In Consultation") {
              continue; // Keep current consultation at position 0
            }
            const currentPriorityVal = getPriorityWeight(p.priority || p.type);
            if (newPriorityVal > currentPriorityVal) {
              insertIdx = i;
              break;
            }
          }

          // 3. Shift positions of subsequent patients
          for (let i = insertIdx; i < activeRoomPatients.length; i++) {
            await tx.patient.update({
              where: { id: activeRoomPatients[i].id },
              data: { position: i + 1 }
            });
          }

          // 4. Create the new patient at the calculated position
          const createdPatient = await tx.patient.create({
            data: {
              token,
              name,
              phone,
              type: finalType,
              status: "Waiting",
              date: todayStr,
              registeredAt: localTime,
              priority: finalPriority,
              position: insertIdx,
              doctorId,
              roomId
            },
            include: {
              doctor: true,
              room: true
            }
          });

          return createdPatient;
        }, { timeout: 20000 });

        // Break on success
        break;
      } catch (error: any) {
        if (error.code === "P2002" && (error.meta?.target?.includes("token") || error.message?.includes("token"))) {
          attempts++;
          console.warn(`Token unique constraint conflict. Retrying transaction (attempt ${attempts}/${maxAttempts})...`);
          if (attempts >= maxAttempts) {
            throw error;
          }
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 50 + 10));
        } else {
          throw error;
        }
      }
    }

    const io = req.app.get("io");
    await autoPromoteAllDoctors(io);

    const finalPatient = await prisma.patient.findUnique({
      where: { id: newPatient.id },
      include: { doctor: true, room: true }
    }) || newPatient;

    // Fetch all patients in the room to map properly
    const updatedRoomPatients = await prisma.patient.findMany({
      where: { roomId, date: todayStr }
    });

    const defaultAvg = Number(config.avgConsultTime) || 15;
    const docAverages = await getDoctorAveragesMap(prisma, defaultAvg);

    const result = mapPatient(finalPatient, config, updatedRoomPatients, docAverages);

    // Emit Socket notification
    if (io) {
      console.log("Broadcasting queue:updated from POST /patients");
      
      // Standard events
      io.emit("queue:updated", {});

      // Standardized new events
      io.emit("queue-updated", {});
      io.emit("wait-time-updated", {});
      io.emit("patient-added", {
        token: finalPatient.token,
        status: finalPatient.status,
        doctor: finalPatient.doctor?.name || "",
        room: finalPatient.room?.name || ""
      });

      if (finalPatient.status === "In Consultation") {
        io.emit("patient-updated", {
          token: finalPatient.token,
          status: "In Consultation",
          doctor: finalPatient.doctor?.name || "",
          room: finalPatient.room?.name || ""
        });
        io.emit("patient-promoted", {
          token: finalPatient.token,
          status: "In Consultation",
          doctor: finalPatient.doctor?.name || "",
          room: finalPatient.room?.name || ""
        });
      }

      broadcastQueueUpdate(io);
    }

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
