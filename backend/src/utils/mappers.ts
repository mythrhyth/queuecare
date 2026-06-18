import { Patient as DbPatient, Doctor as DbDoctor, Room as DbRoom, ClinicConfig } from "@prisma/client";

export function mapPatient(
  patient: DbPatient & { doctor?: DbDoctor | null; room?: DbRoom | null },
  config: ClinicConfig,
  allRoomPatients: DbPatient[], // must include all active patients in the same room today
  doctorAverages?: Record<string, { avgTime: number; basedOn: string }>
) {
  // Active queue patients in the same room are those in status: Waiting, In Queue, In Consultation
  const activeRoomPatients = allRoomPatients
    .filter(p => ["Waiting", "In Queue", "In Consultation"].includes(p.status))
    .sort((a, b) => a.position - b.position);

  // Position of this patient in the active queue
  const activeIndex = activeRoomPatients.findIndex(p => p.id === patient.id);

  // totalAhead is the number of active queue patients before this patient who are not in consultation
  // Let's check how many patients are ahead in the queue (Waiting or In Queue) and before this patient's index
  let totalAhead = 0;
  if (["Waiting", "In Queue"].includes(patient.status) && activeIndex !== -1) {
    totalAhead = activeRoomPatients
      .slice(0, activeIndex)
      .filter(p => ["Waiting", "In Queue"].includes(p.status)).length;
  }

  const avgTime = patient.doctor?.estimatedConsultationDuration ?? (doctorAverages && patient.doctorId ? doctorAverages[patient.doctorId]?.avgTime : null) ?? (Number(config.avgConsultTime) || 15);
  const waitTimeBasedOn = patient.doctor?.estimatedConsultationDuration
    ? "Doctor's estimated duration"
    : (doctorAverages && patient.doctorId && doctorAverages[patient.doctorId]
      ? doctorAverages[patient.doctorId].basedOn
      : "Configured average consultation time");

  const waitTimeVal = totalAhead * avgTime;
  const waitTime = patient.status === "In Consultation" ? "0 min" : `${waitTimeVal} min`;

  const waitTimeExplanation = patient.status === "In Consultation"
    ? "It's your turn! Please proceed to the consultation room."
    : `Based on:\n- ${totalAhead} patient${totalAhead === 1 ? "" : "s"} ahead\n- ${waitTimeBasedOn} (${avgTime} min)`;

  // Find if there is currently a patient in consultation for this doctor/room
  const inConsultPatient = activeRoomPatients.find(p => p.status === "In Consultation");
  const currentServing = inConsultPatient ? inConsultPatient.token : "None";

  return {
    id: patient.id,
    token: patient.token,
    name: patient.name,
    phone: patient.phone,
    doctorId: patient.doctorId || "",
    doctorName: patient.doctor?.name || "Dr. Assigned",
    specialty: patient.doctor?.specialty || "General",
    room: patient.room?.name || "Room Assigned",
    type: patient.type,
    status: patient.status,
    date: patient.date,
    registeredAt: patient.registeredAt,
    waitTime,
    waitTimeExplanation,
    totalAhead,
    currentServing,
    notes: patient.notes || "",
    priority: patient.priority,
    createdAt: patient.createdAt.toISOString()
  };
}

export function mapDoctor(
  doctor: DbDoctor & { room?: DbRoom | null; patients?: DbPatient[] },
  config: ClinicConfig
) {
  // Patients waiting for this doctor (Waiting or In Queue)
  const waitingPatients = (doctor.patients || []).filter(p =>
    ["Waiting", "In Queue"].includes(p.status)
  );

  const patientsWaiting = waitingPatients.length;
  const avgTime = (doctor as any).estimatedConsultationDuration ?? (Number(config.avgConsultTime) || 15);
  const waitTimeVal = patientsWaiting * avgTime;
  const currentWait = `${waitTimeVal} min`;

  return {
    id: doctor.id,
    name: doctor.name,
    specialty: doctor.specialty,
    room: doctor.room?.name || "No Room",
    available: doctor.available,
    currentWait,
    patientsWaiting,
    status: doctor.available ? "Available" : "Off Duty"
  };
}

export function mapRoom(
  room: DbRoom & { doctors?: (DbDoctor & { patients?: DbPatient[] })[]; patients?: DbPatient[] },
  config: ClinicConfig,
  allActivePatients: DbPatient[],
  doctorAverages?: Record<string, { avgTime: number; basedOn: string }>
) {
  // Get all patients currently in the room's queue (Waiting, In Queue, In Consultation)
  const roomPatients = allActivePatients
    .filter(p => p.roomId === room.id && ["Waiting", "In Queue", "In Consultation"].includes(p.status))
    .sort((a, b) => a.position - b.position);

  const queue = roomPatients.map(p => p.token);

  // Occupancy is the number of patients currently in consultation in this room
  const occupancy = roomPatients.filter(p => p.status === "In Consultation").length;

  // Primary doctor assigned to this room
  const primaryDoctor = room.doctors && room.doctors.length > 0 ? room.doctors[0] : null;

  return {
    id: room.id,
    name: room.name,
    doctorId: primaryDoctor?.id || "",
    doctorName: primaryDoctor?.name || "No Doctor Assigned",
    capacity: room.capacity,
    occupancy,
    status: occupancy >= room.capacity ? "Full" : "Available",
    queue,
    patients: roomPatients.map(p => {
      // Find the specific doctor for this patient
      const doc = room.doctors?.find(d => d.id === p.doctorId) || null;
      return mapPatient({ ...p, room, doctor: doc }, config, allActivePatients.filter(x => x.roomId === room.id), doctorAverages);
    })
  };
}
