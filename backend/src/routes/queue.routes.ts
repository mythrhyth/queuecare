import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { mapPatient } from "../utils/mappers";
import { getDoctorAveragesMap } from "../utils/waitTimes";

const prisma = new PrismaClient();
const router = Router();

// GET /queue/live
router.get("/live", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const io = req.app.get("io");
    await autoPromoteAllDoctors(io);
    const todayStr = new Date().toISOString().split("T")[0];

    // Get patients who are not completed/skipped, or keep skipped if they are in queue page
    // The frontend filters: ["All", "Waiting", "In Queue", "In Consultation", "Completed", "Skipped"]
    // So we can return all patients for today, and let the frontend filter,
    // or return patients whose status is Waiting, In Queue, In Consultation, or Skipped.
    // The implementation plan says: GET /queue/live addresses the most important frontend flows.
    // Let's return all patients registered today, so the receptionist can view and filter all of them.
    const patients = await prisma.patient.findMany({
      where: {
        date: todayStr,
        status: { not: "Transferred" }
      },
      include: {
        doctor: true,
        room: true
      },
      orderBy: [
        { status: "desc" }, // consultation first, etc.
        { position: "asc" }
      ]
    });

    const config = await prisma.clinicConfig.findUnique({ where: { id: "default" } }) || { avgConsultTime: "15" } as any;
    const defaultAvg = Number(config.avgConsultTime) || 15;
    const docAverages = await getDoctorAveragesMap(prisma, defaultAvg);

    const mapped = patients.map(p => {
      const roomPatients = patients.filter(x => x.roomId === p.roomId);
      return mapPatient(p, config, roomPatients, docAverages);
    });

    return res.json(mapped);
  } catch (error) {
    next(error);
  }
});

// GET /queue/:token
router.get("/:token", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const io = req.app.get("io");
    await autoPromoteAllDoctors(io);
    const todayStr = new Date().toISOString().split("T")[0];

    const patient = await prisma.patient.findUnique({
      where: { token },
      include: { doctor: true, room: true }
    });

    if (!patient || patient.date !== todayStr) {
      return res.status(404).json({ message: "Token not found" });
    }

    const config = await prisma.clinicConfig.findUnique({ where: { id: "default" } }) || { avgConsultTime: "15" } as any;

    // Get all active patients in this room
    const allRoomPatients = await prisma.patient.findMany({
      where: {
        roomId: patient.roomId,
        date: todayStr
      }
    });

    const defaultAvg = Number(config.avgConsultTime) || 15;
    const docAverages = await getDoctorAveragesMap(prisma, defaultAvg);

    const mappedPatient = mapPatient(patient, config, allRoomPatients, docAverages);

    // Get primary doctor current status
    let updateMessage = `${mappedPatient.doctorName} is currently seeing patients in ${mappedPatient.room}.`;
    if (patient.status === "In Consultation") {
      updateMessage = "It's your turn! Please proceed to the consultation room.";
    } else if (patient.status === "Completed") {
      updateMessage = "Your consultation is complete. Thank you!";
    } else if (mappedPatient.totalAhead === 0) {
      updateMessage = "You are next in line. Please stand by.";
    }

    // Now serving token for this doctor/room
    const servingPatient = allRoomPatients.find(p => p.roomId === patient.roomId && p.status === "In Consultation");
    // Wait, the frontend QueueStatusResponse expects currentServing to be number,
    // but the token might be "T-018". If we split it or extract number:
    // e.g. "T-018" -> 18. Let's try to extract digits, or just send digits,
    // or return the token number itself as a string if the frontend type supports it.
    // In index.ts: currentServing: number. In the portal: {queueData.currentServing} is rendered.
    // Let's send the numeric part if sequential, e.g., T-018 -> 18, otherwise 0.
    let currentServingNum = 0;
    if (servingPatient) {
      const parts = servingPatient.token.split("-");
      const numPart = parts.length > 1 ? parseInt(parts[1]) : parseInt(servingPatient.token);
      currentServingNum = isNaN(numPart) ? 0 : numPart;
    }

    return res.json({
      token: patient.token,
      doctor: mappedPatient.doctorName,
      room: mappedPatient.room,
      totalAhead: mappedPatient.totalAhead,
      waitTime: mappedPatient.waitTime,
      status: patient.status,
      currentServing: currentServingNum,
      update: updateMessage
    });
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

// Helper to recalculate queue positions contiguously for a room
export async function recalculateQueuePositions(tx: any, roomId: string, dateStr: string): Promise<void> {
  const activePatients = await tx.patient.findMany({
    where: {
      roomId,
      date: dateStr,
      status: { in: ["Waiting", "In Queue", "In Consultation"] }
    },
    orderBy: [
      { status: "desc" }, // In Consultation first
      { position: "asc" }
    ]
  });

  const consultationPatient = activePatients.find((p: any) => p.status === "In Consultation");
  const waitingPatients = activePatients.filter((p: any) => p.status !== "In Consultation");

  waitingPatients.sort((a: any, b: any) => {
    const priA = getPriorityWeight(a.priority || a.type || "Normal");
    const priB = getPriorityWeight(b.priority || b.type || "Normal");
    if (priA !== priB) {
      return priB - priA; // Higher priority first
    }
    return a.position - b.position;
  });

  const finalOrder = consultationPatient ? [consultationPatient, ...waitingPatients] : waitingPatients;

  for (let i = 0; i < finalOrder.length; i++) {
    if (finalOrder[i].position !== i) {
      await tx.patient.update({
        where: { id: finalOrder[i].id },
        data: { position: i }
      });
    }
  }
}

// Helper to cascade room changes to doctor's patients and recalculate queues
export async function handleDoctorRoomChange(tx: any, doctorId: string, oldRoomId: string | null, newRoomId: string | null, dateStr: string): Promise<void> {
  if (oldRoomId === newRoomId) return;

  // Update roomId for all active patients of this doctor today
  await tx.patient.updateMany({
    where: {
      doctorId,
      date: dateStr,
      status: { in: ["Waiting", "In Queue", "In Consultation"] }
    },
    data: {
      roomId: newRoomId
    }
  });

  // Recalculate old room if valid
  if (oldRoomId) {
    await recalculateQueuePositions(tx, oldRoomId, dateStr);
  }

  // Recalculate new room if valid
  if (newRoomId) {
    await recalculateQueuePositions(tx, newRoomId, dateStr);
  }
}

// Centralized Socket.IO broadcasting helper
export function broadcastQueueUpdate(io: any): void {
  if (!io) return;
  console.log("Broadcasting centralized real-time update events to all clients");
  // Colon format
  io.emit("queue:updated", {});
  io.emit("rooms:updated", {});
  io.emit("doctors:updated", {});
  io.emit("settings:updated", {});
  io.emit("analytics:updated", {});

  // Dash format
  io.emit("queue-updated", {});
  io.emit("rooms-updated", {});
  io.emit("wait-time-updated", {});
  io.emit("doctor-status-updated", {});
}


// Helper for automatic patient promotion
export async function promoteNextPatient(tx: any, doctorId: string | null, roomId: string | null, dateStr: string): Promise<any> {
  if (!doctorId || !roomId) return null;

  // Check if there is already a patient for this doctor currently "In Consultation" today
  const activeConsultation = await tx.patient.findFirst({
    where: {
      doctorId,
      date: dateStr,
      status: "In Consultation"
    }
  });

  if (activeConsultation) {
    return null; // Doctor already has a patient in consultation
  }

  // Find the next patient in the room's queue for this doctor with status "Waiting" or "In Queue"
  const nextPatient = await tx.patient.findFirst({
    where: {
      roomId,
      doctorId,
      date: dateStr,
      status: { in: ["Waiting", "In Queue"] }
    },
    orderBy: { position: "asc" }
  });

  if (nextPatient) {
    return await tx.patient.update({
      where: { id: nextPatient.id },
      data: {
        status: "In Consultation",
        consultationStartedAt: new Date()
      },
      include: { doctor: true, room: true }
    });
  }
  return null;
}

export async function autoPromoteAllDoctors(io?: any): Promise<void> {
  const todayStr = new Date().toISOString().split("T")[0];

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Get all available doctors who are assigned to a room
      const availableDoctors = await tx.doctor.findMany({
        where: {
          available: true,
          roomId: { not: null }
        }
      });

      for (const doc of availableDoctors) {
        // 2. Check if this doctor already has a patient "In Consultation" today
        const activeConsultation = await tx.patient.findFirst({
          where: {
            doctorId: doc.id,
            date: todayStr,
            status: "In Consultation"
          }
        });

        if (!activeConsultation) {
          // 3. Find the first waiting/in queue patient for this doctor today
          const nextPatient = await tx.patient.findFirst({
            where: {
              roomId: doc.roomId,
              doctorId: doc.id,
              date: todayStr,
              status: { in: ["Waiting", "In Queue"] }
            },
            orderBy: { position: "asc" }
          });

          if (nextPatient) {
            // Promote this patient to In Consultation
            const promoted = await tx.patient.update({
              where: { id: nextPatient.id },
              data: {
                status: "In Consultation",
                consultationStartedAt: new Date()
              },
              include: { doctor: true, room: true }
            });

            // Recalculate positions for all active patients in this room today
            await recalculateQueuePositions(tx, doc.roomId, todayStr);

            // Emit socket events if io is provided
            if (io) {
              console.log(`Auto-promoted token ${promoted.token} for doctor ${doc.name}`);
              
              // Standard events
              io.emit("queue:updated", {});
              io.emit("patient:status-changed", {
                token: promoted.token,
                status: "In Consultation",
                doctor: promoted.doctor?.name || "",
                room: promoted.room?.name || ""
              });

              // Standardized new events
              io.emit("queue-updated", {});
              io.emit("wait-time-updated", {});
              io.emit("patient-updated", {
                token: promoted.token,
                status: "In Consultation",
                doctor: promoted.doctor?.name || "",
                room: promoted.room?.name || ""
              });
              io.emit("patient-promoted", {
                token: promoted.token,
                status: "In Consultation",
                doctor: promoted.doctor?.name || "",
                room: promoted.room?.name || ""
              });
            }
          }
        }
      }
    });
  } catch (error) {
    console.error("Error in autoPromoteAllDoctors:", error);
  }
}

// PUT /queue/:token/status
router.put("/:token/status", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    let promotedToken: string | null = null;
    let promotedPatient: any = null;

    const updatedPatient = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({
        where: { token },
        include: { doctor: true, room: true }
      });

      if (!patient || patient.date !== todayStr) {
        throw new Error("Patient token not found");
      }

      if (status === "In Consultation") {
        // Enforce: only one patient per doctor can be in consultation at a time
        const activeConsultation = await tx.patient.findFirst({
          where: {
            doctorId: patient.doctorId,
            date: todayStr,
            status: "In Consultation",
            id: { not: patient.id }
          }
        });
        if (activeConsultation) {
          throw new Error("Doctor already has a patient in consultation");
        }
      }

      if (status === "Skipped" || status === "Skip") {
        // Get all active patients in this room today, sorted by position
        const activePatients = await tx.patient.findMany({
          where: {
            roomId: patient.roomId,
            date: todayStr,
            status: { in: ["Waiting", "In Queue", "In Consultation"] }
          },
          orderBy: { position: "asc" }
        });

        const idx = activePatients.findIndex(p => p.token === token);
        if (idx !== -1 && idx < activePatients.length - 1) {
          const nextPatient = activePatients[idx + 1];
          // Swap the positions of the two patients
          await tx.patient.update({
            where: { id: patient.id },
            data: {
              position: idx + 1,
              status: "Waiting"
            }
          });
          await tx.patient.update({
            where: { id: nextPatient.id },
            data: {
              position: idx
            }
          });
        } else {
          // If already last or not found, just ensure status is Waiting
          await tx.patient.update({
            where: { id: patient.id },
            data: {
              status: "Waiting"
            }
          });
        }

        // Promote next patient since doctor consultation slot is now empty
        promotedPatient = await promoteNextPatient(tx, patient.doctorId, patient.roomId, todayStr);
        promotedToken = promotedPatient ? promotedPatient.token : null;
      } else {
        // Update patient status normally
        const dataToUpdate: any = { status };
        if (status === "In Consultation") {
          dataToUpdate.consultationStartedAt = new Date();
        } else if (status === "Completed") {
          const endedAt = new Date();
          dataToUpdate.consultationEndedAt = endedAt;
          const startedAt = patient.consultationStartedAt || patient.createdAt;
          const durationSec = Math.round((endedAt.getTime() - new Date(startedAt).getTime()) / 1000);
          dataToUpdate.consultationDuration = durationSec > 0 ? durationSec : 0;

          if (patient.doctorId) {
            const completedConsults = await tx.patient.findMany({
              where: {
                doctorId: patient.doctorId,
                status: "Completed",
                consultationDuration: { not: null }
              },
              select: {
                consultationDuration: true
              }
            });

            const durations = completedConsults.map(p => p.consultationDuration || 0);
            durations.push(dataToUpdate.consultationDuration);

            if (durations.length > 0) {
              const totalDuration = durations.reduce((acc, curr) => acc + curr, 0);
              const avgDurationMin = Math.round(totalDuration / durations.length / 60);
              const updatedAvg = avgDurationMin > 0 ? avgDurationMin : 1;

              await tx.doctor.update({
                where: { id: patient.doctorId },
                data: { estimatedConsultationDuration: updatedAvg }
              });
            }
          }
        }

        await tx.patient.update({
          where: { id: patient.id },
          data: dataToUpdate
        });

        // Recalculate remaining patients' positions if they left the active queue
        if (["Completed", "Cancelled", "Transferred"].includes(status)) {
          // Automatic next patient promotion
          promotedPatient = await promoteNextPatient(tx, patient.doctorId, patient.roomId, todayStr);
          promotedToken = promotedPatient ? promotedPatient.token : null;

          const activePatients = await tx.patient.findMany({
            where: {
              roomId: patient.roomId,
              date: todayStr,
              status: { in: ["Waiting", "In Queue", "In Consultation"] }
            },
            orderBy: { position: "asc" }
          });

          for (let i = 0; i < activePatients.length; i++) {
            await tx.patient.update({
              where: { id: activePatients[i].id },
              data: { position: i }
            });
          }
        }
      }

      return await tx.patient.findUnique({
        where: { id: patient.id },
        include: { doctor: true, room: true }
      });
    });

    if (!updatedPatient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Load configs
    const config = await prisma.clinicConfig.findUnique({ where: { id: "default" } }) || { avgConsultTime: "15" } as any;
    const defaultAvg = Number(config.avgConsultTime) || 15;
    const docAverages = await getDoctorAveragesMap(prisma, defaultAvg);

    const allRoomPatients = await prisma.patient.findMany({
      where: { roomId: updatedPatient.roomId, date: todayStr }
    });

    const result = mapPatient(updatedPatient, config, allRoomPatients, docAverages);

    // Socket events
    const io = req.app.get("io");
    await autoPromoteAllDoctors(io);
    if (io) {
      console.log(`Broadcasting status-changed and queue:updated for token ${token}`);
      io.emit("queue:updated", {});
      io.emit("patient:status-changed", {
        token,
        status: updatedPatient.status,
        doctor: updatedPatient.doctor?.name || "",
        room: updatedPatient.room?.name || ""
      });
      if (promotedPatient) {
        io.emit("patient:status-changed", {
          token: promotedPatient.token,
          status: "In Consultation",
          doctor: promotedPatient.doctor?.name || "",
          room: promotedPatient.room?.name || ""
        });
      }

      // Standardized new events
      io.emit("queue-updated", {});
      io.emit("wait-time-updated", {});
      
      io.emit("patient-updated", {
        token,
        status: updatedPatient.status,
        doctor: updatedPatient.doctor?.name || "",
        room: updatedPatient.room?.name || ""
      });

      if (updatedPatient.status === "In Consultation") {
        io.emit("patient-promoted", {
          token,
          status: updatedPatient.status,
          doctor: updatedPatient.doctor?.name || "",
          room: updatedPatient.room?.name || ""
        });
      } else if (updatedPatient.status === "Completed") {
        io.emit("patient-completed", {
          token,
          status: updatedPatient.status,
          doctor: updatedPatient.doctor?.name || "",
          room: updatedPatient.room?.name || ""
        });
      } else if (updatedPatient.status === "Cancelled") {
        io.emit("patient-cancelled", {
          token,
          status: updatedPatient.status,
          doctor: updatedPatient.doctor?.name || "",
          room: updatedPatient.room?.name || ""
        });
      }

      if (promotedPatient) {
        io.emit("patient-updated", {
          token: promotedPatient.token,
          status: "In Consultation",
          doctor: promotedPatient.doctor?.name || "",
          room: promotedPatient.room?.name || ""
        });
        io.emit("patient-promoted", {
          token: promotedPatient.token,
          status: "In Consultation",
          doctor: promotedPatient.doctor?.name || "",
          room: promotedPatient.room?.name || ""
        });
      }

      broadcastQueueUpdate(io);
    }

    return res.json(result);
  } catch (error: any) {
    if (error.message === "Patient token not found") {
      return res.status(404).json({ message: error.message });
    }
    if (error.message.includes("already has a patient")) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

// PUT /queue/:token/transfer
router.put("/:token/transfer", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const { room: roomName, doctorId } = req.body;

    if (!roomName && !doctorId) {
      return res.status(400).json({ message: "Room name or doctorId is required" });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    let promotedToken: string | null = null;
    let promotedPatient: any = null;
    let targetPromotedPatient: any = null;

    const { newPatient, targetPromotedPatient: tPromoted } = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findUnique({
        where: { token },
        include: { doctor: true, room: true }
      });

      if (!patient || patient.date !== todayStr) {
        throw new Error("Patient token not found");
      }

      const oldRoomId = patient.roomId;

      // Resolve target room and doctor
      let targetRoomId = patient.roomId;
      let targetDoctorId = patient.doctorId;

      if (roomName) {
        const room = await tx.room.findUnique({ where: { name: roomName } });
        if (!room) {
          throw new Error(`Room "${roomName}" not found`);
        }
        targetRoomId = room.id;
      }

      if (doctorId) {
        const doctor = await tx.doctor.findUnique({ where: { id: doctorId } });
        if (!doctor) {
          throw new Error("Doctor not found");
        }
        targetDoctorId = doctor.id;
        // If doctor is assigned to a room, transfer patient to that room as well
        if (doctor.roomId) {
          targetRoomId = doctor.roomId;
        }
      } else if (roomName) {
        // Find default doctor in that room
        const doctorInRoom = await tx.doctor.findFirst({ where: { roomId: targetRoomId } });
        if (doctorInRoom) {
          targetDoctorId = doctorInRoom.id;
        }
      }

      // Mark old patient record as status "Transferred", and append unique suffix to the token
      const timestamp = Date.now();
      const transferredToken = `${token}-TR-${timestamp}`;

      await tx.patient.update({
        where: { id: patient.id },
        data: {
          token: transferredToken,
          status: "Transferred",
          position: -1
        }
      });

      // Promote the next patient for the old doctor in the old room
      promotedPatient = await promoteNextPatient(tx, patient.doctorId, patient.roomId, todayStr);
      promotedToken = promotedPatient ? promotedPatient.token : null;

      // Get active patients in the target room to compute priority insertion position
      const activeTargetPatients = await tx.patient.findMany({
        where: {
          roomId: targetRoomId,
          date: todayStr,
          status: { in: ["Waiting", "In Queue", "In Consultation"] }
        },
        orderBy: { position: "asc" }
      });

      let insertIdx = activeTargetPatients.length;
      const newPriorityVal = getPriorityWeight(patient.priority || patient.type || "Normal");

      for (let i = 0; i < activeTargetPatients.length; i++) {
        const p = activeTargetPatients[i];
        if (p.status === "In Consultation") {
          continue; // Keep current consultation at position 0
        }
        const currentPriorityVal = getPriorityWeight(p.priority || p.type || "Normal");
        if (newPriorityVal > currentPriorityVal) {
          insertIdx = i;
          break;
        }
      }

      // Shift subsequent active patients in target room
      for (let i = insertIdx; i < activeTargetPatients.length; i++) {
        await tx.patient.update({
          where: { id: activeTargetPatients[i].id },
          data: { position: i + 1 }
        });
      }

      // Create new patient record in target room
      const createdPatient = await tx.patient.create({
        data: {
          token, // original token
          name: patient.name,
          phone: patient.phone,
          type: patient.type,
          status: "Waiting",
          date: patient.date,
          registeredAt: patient.registeredAt,
          createdAt: patient.createdAt,
          notes: patient.notes,
          priority: patient.priority,
          position: insertIdx,
          doctorId: targetDoctorId,
          roomId: targetRoomId
        },
        include: {
          doctor: true,
          room: true
        }
      });

      // Recalculate remaining patients in old room (if oldRoomId differs from targetRoomId)
      if (oldRoomId && oldRoomId !== targetRoomId) {
        const remainingOldPatients = await tx.patient.findMany({
          where: {
            roomId: oldRoomId,
            date: todayStr,
            status: { in: ["Waiting", "In Queue", "In Consultation"] }
          },
          orderBy: { position: "asc" }
        });

        for (let i = 0; i < remainingOldPatients.length; i++) {
          await tx.patient.update({
            where: { id: remainingOldPatients[i].id },
            data: { position: i }
          });
        }
      }

      return { newPatient: createdPatient, targetPromotedPatient: null as any };
    });

    if (!newPatient) {
      return res.status(404).json({ message: "Transferred patient not found" });
    }

    // Load configs
    const config = await prisma.clinicConfig.findUnique({ where: { id: "default" } }) || { avgConsultTime: "15" } as any;
    const defaultAvg = Number(config.avgConsultTime) || 15;
    const docAverages = await getDoctorAveragesMap(prisma, defaultAvg);

    const allRoomPatients = await prisma.patient.findMany({
      where: { roomId: newPatient.roomId, date: todayStr }
    });

    const mappedResult = mapPatient(newPatient, config, allRoomPatients, docAverages);

    // Socket events
    const io = req.app.get("io");
    await autoPromoteAllDoctors(io);
    if (io) {
      console.log(`Broadcasting patient:transferred and queue:updated for token ${token}`);
      
      const timestamp = Date.now();

      // Standard events
      io.emit("queue:updated", {});
      io.emit("patient:transferred", { token, room: roomName });
      io.emit("patient:status-changed", {
        token,
        status: "Transferred",
        doctor: newPatient.doctor?.name || "",
        room: newPatient.room?.name || ""
      });
      if (promotedPatient) {
        io.emit("patient:status-changed", {
          token: promotedPatient.token,
          status: "In Consultation",
          doctor: promotedPatient.doctor?.name || "",
          room: promotedPatient.room?.name || ""
        });
      }
      if (tPromoted && tPromoted.id !== newPatient.id) {
        io.emit("patient:status-changed", {
          token: tPromoted.token,
          status: "In Consultation",
          doctor: tPromoted.doctor?.name || "",
          room: tPromoted.room?.name || ""
        });
      }

      // Standardized new events
      io.emit("queue-updated", {});
      io.emit("wait-time-updated", {});
      
      io.emit("patient-updated", {
        token: `${token}-TR-${timestamp}`,
        status: "Transferred",
        doctor: newPatient.doctor?.name || "",
        room: newPatient.room?.name || ""
      });
      io.emit("patient-transferred", { token, room: roomName });

      io.emit("patient-updated", {
        token: newPatient.token,
        status: newPatient.status,
        doctor: newPatient.doctor?.name || "",
        room: newPatient.room?.name || ""
      });

      if (newPatient.status === "In Consultation") {
        io.emit("patient-promoted", {
          token: newPatient.token,
          status: newPatient.status,
          doctor: newPatient.doctor?.name || "",
          room: newPatient.room?.name || ""
        });
      }

      if (tPromoted && tPromoted.id !== newPatient.id) {
        io.emit("patient-updated", {
          token: tPromoted.token,
          status: "In Consultation",
          doctor: tPromoted.doctor?.name || "",
          room: tPromoted.room?.name || ""
        });
        io.emit("patient-promoted", {
          token: tPromoted.token,
          status: "In Consultation",
          doctor: tPromoted.doctor?.name || "",
          room: tPromoted.room?.name || ""
        });
      }

      if (promotedPatient) {
        io.emit("patient-updated", {
          token: promotedPatient.token,
          status: "In Consultation",
          doctor: promotedPatient.doctor?.name || "",
          room: promotedPatient.room?.name || ""
        });
        io.emit("patient-promoted", {
          token: promotedPatient.token,
          status: "In Consultation",
          doctor: promotedPatient.doctor?.name || "",
          room: promotedPatient.room?.name || ""
        });
      }

      broadcastQueueUpdate(io);
    }

    return res.json(mappedResult);
  } catch (error: any) {
    if (error.message === "Patient token not found" || error.message.includes("not found")) {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
});

export default router;
