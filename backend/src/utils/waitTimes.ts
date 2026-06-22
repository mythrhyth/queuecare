import { PrismaClient } from "@prisma/client";

export async function getDoctorAveragesMap(
  prisma: PrismaClient,
  defaultAvg: number
): Promise<Record<string, { avgTime: number; basedOn: string }>> {
  const doctors = await prisma.doctor.findMany({ select: { id: true } });
  const docAverages: Record<string, { avgTime: number; basedOn: string }> = {};

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

  // Optimized: Calculate doctor-specific averages using groupBy
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

  // Map averages back to all doctors
  for (const doc of doctors) {
    const docData = aggregateMap[doc.id];
    const docCount = docData ? docData.count : 0;
    const docAvgSec = docData ? docData.avgSec : null;

    if (docCount >= 3 && docAvgSec !== null) {
      const avgMin = Math.round(docAvgSec / 60);
      docAverages[doc.id] = {
        avgTime: avgMin > 0 ? avgMin : 1,
        basedOn: `Doctor-specific average (${docCount} consultations)`
      };
    } else {
      docAverages[doc.id] = {
        avgTime: globalAvgMin,
        basedOn: globalBasedOn
      };
    }
  }

  return docAverages;
}
