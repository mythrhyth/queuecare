import { Router, Request, Response } from "express";

const router = Router();

// GET /home/summary
router.get("/summary", async (req: Request, res: Response) => {
  return res.json({
    liveServingToken: "T-015",
    room: "Room 2",
    doctor: "Dr. Verma",
    stats: {
      clinicsCount: "500+",
      patientsCount: "2M+",
      uptime: "99.9%"
    },
    queue: [
      { token: "T-016", status: "Waiting" },
      { token: "T-017", status: "In Queue" },
      { token: "T-018", status: "In Queue" },
      { token: "T-019", status: "Waiting" },
      { token: "T-020", status: "Waiting" },
      { token: "T-021", status: "Waiting" }
    ]
  });
});

// GET /home/doctors
router.get("/doctors", async (req: Request, res: Response) => {
  return res.json([
    {
      id: "mock-doc-1",
      name: "Dr. Sharma",
      specialty: "Cardiology",
      room: "Room 1",
      available: true,
      currentWait: "14 min",
      patientsWaiting: 2,
      status: "Available"
    },
    {
      id: "mock-doc-2",
      name: "Dr. Patel",
      specialty: "Pediatrics",
      room: "Room 3",
      available: true,
      currentWait: "28 min",
      patientsWaiting: 4,
      status: "Available"
    }
  ]);
});

export default router;
