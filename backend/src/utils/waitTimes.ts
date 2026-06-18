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

  // Calculate doctor-specific averages
  for (const doc of doctors) {
    const docCompleted = await prisma.patient.aggregate({
      where: {
        doctorId: doc.id,
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

    const docCount = docCompleted._count.id;
    const docAvgSec = docCompleted._avg.consultationDuration;

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
