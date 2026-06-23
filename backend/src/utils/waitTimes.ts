import { PrismaClient } from "@prisma/client";

export interface DoctorWaitTimeModel {
  avgTime: number;
  basedOn: string;
  regression?: {
    slope: number;
    intercept: number;
    pointsCount: number;
    r2: number;
  };
}

export async function getDoctorAveragesMap(
  prisma: PrismaClient,
  defaultAvg: number
): Promise<Record<string, DoctorWaitTimeModel>> {
  const doctors = await prisma.doctor.findMany({ select: { id: true } });
  const docAverages: Record<string, DoctorWaitTimeModel> = {};

  // Get global historical average (requires at least 3 completed consultations)
  const globalCompleted = await prisma.patient.aggregate({
    where: {
      status: "Completed",
      consultationDuration: { not: null }
    },
    _avg: {
      consultationDuration: true
    },
    _count: {
      id: true
    }
  });

  const globalCount = globalCompleted._count.id;
  const globalAvgSec = globalCompleted._avg.consultationDuration;
  let globalAvgMin = defaultAvg;
  let globalBasedOn = "Configured average consultation time";

  if (globalCount >= 3 && globalAvgSec !== null) {
    globalAvgMin = Math.round(globalAvgSec / 60);
    globalAvgMin = globalAvgMin > 0 ? globalAvgMin : 1;
    globalBasedOn = `Global clinic average (${globalCount} consultations)`;
  }

  // Calculate doctor-specific averages using groupBy
  const docCompletedAggregates = await prisma.patient.groupBy({
    by: ['doctorId'],
    where: {
      status: "Completed",
      consultationDuration: { not: null },
      doctorId: { not: null }
    },
    _avg: {
      consultationDuration: true
    },
    _count: {
      id: true
    }
  });

  // Convert aggregates to a fast-lookup map
  const aggregateMap: Record<string, { count: number; avgSec: number | null }> = {};
  for (const agg of docCompletedAggregates) {
    if (agg.doctorId) {
      aggregateMap[agg.doctorId] = {
        count: agg._count.id,
        avgSec: agg._avg.consultationDuration
      };
    }
  }

  // --- Linear Regression Calculation ---
  // Fetch patients from the last 7 days for all doctors in one query
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const historicalPatients = await prisma.patient.findMany({
    where: {
      createdAt: { gte: sevenDaysAgo },
      doctorId: { not: null }
    },
    select: {
      id: true,
      doctorId: true,
      createdAt: true,
      consultationStartedAt: true,
      status: true
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  // Group historical patients by doctorId
  const patientsByDoctor: Record<string, typeof historicalPatients> = {};
  for (const p of historicalPatients) {
    if (p.doctorId) {
      if (!patientsByDoctor[p.doctorId]) {
        patientsByDoctor[p.doctorId] = [];
      }
      patientsByDoctor[p.doctorId].push(p);
    }
  }

  const doctorRegressions: Record<string, { slope: number; intercept: number; pointsCount: number; r2: number }> = {};

  for (const docId of Object.keys(patientsByDoctor)) {
    const docPatients = patientsByDoctor[docId];
    
    // Reconstruct arrival and start consultation events
    const events: Array<{ time: number; type: "arrive" | "start"; id: string }> = [];
    for (const p of docPatients) {
      events.push({
        time: new Date(p.createdAt).getTime(),
        type: "arrive",
        id: p.id
      });
      if (p.consultationStartedAt) {
        events.push({
          time: new Date(p.consultationStartedAt).getTime(),
          type: "start",
          id: p.id
        });
      }
    }

    // Sort events. Arrivals first if timestamps are equal.
    events.sort((a, b) => {
      if (a.time !== b.time) return a.time - b.time;
      if (a.type === b.type) return 0;
      return a.type === "arrive" ? -1 : 1;
    });

    const activeQueue: string[] = [];
    const patientsAheadMap: Record<string, number> = {};

    for (const ev of events) {
      if (ev.type === "arrive") {
        patientsAheadMap[ev.id] = activeQueue.length;
        activeQueue.push(ev.id);
      } else if (ev.type === "start") {
        const idx = activeQueue.indexOf(ev.id);
        if (idx !== -1) {
          activeQueue.splice(idx, 1);
        }
      }
    }

    // Collect coordinates (X, Y)
    const xValues: number[] = [];
    const yValues: number[] = [];

    for (const p of docPatients) {
      if (p.consultationStartedAt) {
        const x = patientsAheadMap[p.id];
        const waitTimeMs = new Date(p.consultationStartedAt).getTime() - new Date(p.createdAt).getTime();
        const y = waitTimeMs / 60000; // in minutes

        if (x !== undefined && y >= 0) {
          xValues.push(x);
          yValues.push(y);
        }
      }
    }

    const n = xValues.length;
    // Require at least 5 data points for regression
    if (n >= 5) {
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
      for (let i = 0; i < n; i++) {
        sumX += xValues[i];
        sumY += yValues[i];
        sumXY += xValues[i] * yValues[i];
        sumX2 += xValues[i] * xValues[i];
        sumY2 += yValues[i] * yValues[i];
      }

      const denom = (n * sumX2 - sumX * sumX);
      if (denom !== 0) {
        let slope = (n * sumXY - sumX * sumY) / denom;
        let intercept = (sumY - slope * sumX) / n;

        // Compute R2 (coefficient of determination)
        const meanY = sumY / n;
        let ssTot = 0;
        let ssRes = 0;
        for (let i = 0; i < n; i++) {
          const predY = intercept + slope * xValues[i];
          ssTot += (yValues[i] - meanY) * (yValues[i] - meanY);
          ssRes += (yValues[i] - predY) * (yValues[i] - predY);
        }
        const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);

        // Positive slope sanity filter (more people = longer wait).
        // Cap slope between 2 and 60 minutes.
        // Intercept must be non-negative.
        if (slope > 0) {
          slope = Math.max(2, Math.min(60, slope));
          intercept = Math.max(0, intercept);
          doctorRegressions[docId] = {
            slope,
            intercept,
            pointsCount: n,
            r2
          };
        }
      }
    }
  }

  // Map averages and regression back to all doctors
  for (const doc of doctors) {
    const docData = aggregateMap[doc.id];
    const docCount = docData ? docData.count : 0;
    const docAvgSec = docData ? docData.avgSec : null;

    let avgTime = globalAvgMin;
    let basedOn = globalBasedOn;

    if (docCount >= 3 && docAvgSec !== null) {
      const avgMin = Math.round(docAvgSec / 60);
      avgTime = avgMin > 0 ? avgMin : 1;
      basedOn = `Doctor-specific average (${docCount} consultations)`;
    }

    docAverages[doc.id] = {
      avgTime,
      basedOn,
      regression: doctorRegressions[doc.id] || undefined
    };
  }

  return docAverages;
}
