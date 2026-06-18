import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with professional hackathon demo data...");

  // 1. Clean Database
  await prisma.patient.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clinicConfig.deleteMany();
  await prisma.notificationSettings.deleteMany();

  // 2. Create Receptionist and Admin Users
  const receptionistPassword = await bcrypt.hash("password123", 10);
  const adminPassword = await bcrypt.hash("admin123", 10);

  const receptionist = await prisma.user.create({
    data: {
      email: "receptionist@clinic.com",
      password: receptionistPassword,
      name: "Clinic Receptionist",
      role: "receptionist",
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@clinic.com",
      password: adminPassword,
      name: "Clinic Administrator",
      role: "admin",
    },
  });

  console.log("Created users:", receptionist.email, admin.email);

  // 3. Create Rooms (Room 1 to Room 5)
  const room1 = await prisma.room.create({ data: { name: "Room 1", capacity: 15, status: "Available" } });
  const room2 = await prisma.room.create({ data: { name: "Room 2", capacity: 15, status: "Available" } });
  const room3 = await prisma.room.create({ data: { name: "Room 3", capacity: 15, status: "Available" } });
  const room4 = await prisma.room.create({ data: { name: "Room 4", capacity: 15, status: "Available" } });
  const room5 = await prisma.room.create({ data: { name: "Room 5", capacity: 15, status: "Available" } });

  console.log("Created rooms: Room 1, Room 2, Room 3, Room 4, Room 5");

  // 4. Create Doctors with room assignments, availability, status, and custom average consultation times
  const drSharma = await prisma.doctor.create({
    data: {
      name: "Dr. Raj Sharma",
      specialty: "General Medicine",
      available: true,
      status: "Available",
      roomId: room1.id,
      estimatedConsultationDuration: 12, // 12 min avg
    },
  });

  const drPatel = await prisma.doctor.create({
    data: {
      name: "Dr. Priya Patel",
      specialty: "Cardiology",
      available: true,
      status: "Available",
      roomId: room2.id,
      estimatedConsultationDuration: 16, // 16 min avg
    },
  });

  const drGupta = await prisma.doctor.create({
    data: {
      name: "Dr. Amit Gupta",
      specialty: "Pediatrics",
      available: true,
      status: "Available",
      roomId: room3.id,
      estimatedConsultationDuration: 10, // 10 min avg
    },
  });

  const drVerma = await prisma.doctor.create({
    data: {
      name: "Dr. Neha Verma",
      specialty: "Orthopedics",
      available: true,
      status: "Available",
      roomId: room4.id,
      estimatedConsultationDuration: 15, // 15 min avg
    },
  });

  const drSingh = await prisma.doctor.create({
    data: {
      name: "Dr. Arjun Singh",
      specialty: "Dermatology",
      available: true,
      status: "Available",
      roomId: room5.id,
      estimatedConsultationDuration: 14, // 14 min avg
    },
  });

  console.log("Created doctors: Dr. Raj Sharma, Dr. Priya Patel, Dr. Amit Gupta, Dr. Neha Verma, Dr. Arjun Singh");

  // 5. Create Default Configurations
  await prisma.clinicConfig.create({
    data: {
      id: "default",
      avgConsultTime: "15",
      tokenMethod: "sequential",
      maxQueue: "50",
      prioritySenior: true,
      priorityEmergency: true,
    },
  });

  await prisma.notificationSettings.create({
    data: {
      id: "default",
      browser: true,
      sms: false,
      queueAlerts: true,
    },
  });

  console.log("Created default configs");

  // Dates setup
  const todayStr = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // 6. Seed Historical Patient Data (Yesterday) to train the wait-time prediction engine
  // Dr. Raj Sharma (Avg: 12 min = 720 sec)
  await prisma.patient.create({
    data: {
      token: "H-101", name: "Karan Johar", phone: "+91 99999 11111", type: "Normal", priority: "Normal",
      status: "Completed", date: yesterdayStr, registeredAt: "09:30 AM", position: -1,
      doctorId: drSharma.id, roomId: room1.id,
      consultationStartedAt: new Date(yesterday.setHours(9, 30, 0)),
      consultationEndedAt: new Date(yesterday.setHours(9, 42, 0)), // 12 min
      consultationDuration: 720,
    },
  });
  await prisma.patient.create({
    data: {
      token: "H-102", name: "Suresh Raina", phone: "+91 99999 11112", type: "Normal", priority: "Normal",
      status: "Completed", date: yesterdayStr, registeredAt: "09:50 AM", position: -1,
      doctorId: drSharma.id, roomId: room1.id,
      consultationStartedAt: new Date(yesterday.setHours(9, 50, 0)),
      consultationEndedAt: new Date(yesterday.setHours(10, 1, 0)), // 11 min
      consultationDuration: 660,
    },
  });
  await prisma.patient.create({
    data: {
      token: "H-103", name: "Rahul Dravid", phone: "+91 99999 11113", type: "Normal", priority: "Normal",
      status: "Completed", date: yesterdayStr, registeredAt: "10:10 AM", position: -1,
      doctorId: drSharma.id, roomId: room1.id,
      consultationStartedAt: new Date(yesterday.setHours(10, 10, 0)),
      consultationEndedAt: new Date(yesterday.setHours(10, 23, 0)), // 13 min
      consultationDuration: 780,
    },
  });

  // Dr. Priya Patel (Avg: 16 min = 960 sec)
  await prisma.patient.create({
    data: {
      token: "H-104", name: "Deepika Padukone", phone: "+91 99999 22221", type: "Normal", priority: "Normal",
      status: "Completed", date: yesterdayStr, registeredAt: "10:00 AM", position: -1,
      doctorId: drPatel.id, roomId: room2.id,
      consultationStartedAt: new Date(yesterday.setHours(10, 0, 0)),
      consultationEndedAt: new Date(yesterday.setHours(10, 16, 0)), // 16 min
      consultationDuration: 960,
    },
  });
  await prisma.patient.create({
    data: {
      token: "H-105", name: "Ranbir Kapoor", phone: "+91 99999 22222", type: "Normal", priority: "Normal",
      status: "Completed", date: yesterdayStr, registeredAt: "10:20 AM", position: -1,
      doctorId: drPatel.id, roomId: room2.id,
      consultationStartedAt: new Date(yesterday.setHours(10, 20, 0)),
      consultationEndedAt: new Date(yesterday.setHours(10, 35, 0)), // 15 min
      consultationDuration: 900,
    },
  });
  await prisma.patient.create({
    data: {
      token: "H-106", name: "Alia Bhatt", phone: "+91 99999 22223", type: "Normal", priority: "Normal",
      status: "Completed", date: yesterdayStr, registeredAt: "10:40 AM", position: -1,
      doctorId: drPatel.id, roomId: room2.id,
      consultationStartedAt: new Date(yesterday.setHours(10, 40, 0)),
      consultationEndedAt: new Date(yesterday.setHours(10, 57, 0)), // 17 min
      consultationDuration: 1020,
    },
  });

  // Dr. Amit Gupta (Avg: 10 min = 600 sec)
  await prisma.patient.create({
    data: {
      token: "H-107", name: "Sachin Tendulkar", phone: "+91 99999 33331", type: "Normal", priority: "Normal",
      status: "Completed", date: yesterdayStr, registeredAt: "11:00 AM", position: -1,
      doctorId: drGupta.id, roomId: room3.id,
      consultationStartedAt: new Date(yesterday.setHours(11, 0, 0)),
      consultationEndedAt: new Date(yesterday.setHours(11, 10, 0)), // 10 min
      consultationDuration: 600,
    },
  });
  await prisma.patient.create({
    data: {
      token: "H-108", name: "MS Dhoni", phone: "+91 99999 33332", type: "Normal", priority: "Normal",
      status: "Completed", date: yesterdayStr, registeredAt: "11:15 AM", position: -1,
      doctorId: drGupta.id, roomId: room3.id,
      consultationStartedAt: new Date(yesterday.setHours(11, 15, 0)),
      consultationEndedAt: new Date(yesterday.setHours(11, 24, 0)), // 9 min
      consultationDuration: 540,
    },
  });
  await prisma.patient.create({
    data: {
      token: "H-109", name: "Virat Kohli", phone: "+91 99999 33333", type: "Normal", priority: "Normal",
      status: "Completed", date: yesterdayStr, registeredAt: "11:30 AM", position: -1,
      doctorId: drGupta.id, roomId: room3.id,
      consultationStartedAt: new Date(yesterday.setHours(11, 30, 0)),
      consultationEndedAt: new Date(yesterday.setHours(11, 41, 0)), // 11 min
      consultationDuration: 660,
    },
  });

  // 7. Seed Active Queue Data & Analytics Supporting Data for Today
  // Room 1 (Dr. Raj Sharma) - Patients Waiting & In Consultation
  await prisma.patient.create({
    data: {
      token: "T-001", name: "Rajesh Kumar", phone: "+91 98765 00001", type: "Normal", priority: "Normal",
      status: "In Consultation", date: todayStr, registeredAt: "09:00 AM", position: 0,
      doctorId: drSharma.id, roomId: room1.id, consultationStartedAt: new Date(),
    },
  });
  await prisma.patient.create({
    data: {
      token: "T-002", name: "Sunita Devi", phone: "+91 98765 00002", type: "Senior Citizen", priority: "Senior Citizen",
      status: "Waiting", date: todayStr, registeredAt: "09:15 AM", position: 1,
      doctorId: drSharma.id, roomId: room1.id,
    },
  });
  await prisma.patient.create({
    data: {
      token: "T-003", name: "Amit Patel", phone: "+91 98765 00003", type: "Normal", priority: "Normal",
      status: "Waiting", date: todayStr, registeredAt: "09:30 AM", position: 2,
      doctorId: drSharma.id, roomId: room1.id,
    },
  });

  // Room 2 (Dr. Priya Patel) - Emergency patient placed at the front
  await prisma.patient.create({
    data: {
      token: "E-001", name: "Vikram Singh", phone: "+91 98765 00004", type: "Emergency", priority: "Emergency",
      status: "In Consultation", date: todayStr, registeredAt: "10:00 AM", position: 0,
      doctorId: drPatel.id, roomId: room2.id, consultationStartedAt: new Date(),
      notes: "Severe chest discomfort, immediate attention.",
    },
  });
  await prisma.patient.create({
    data: {
      token: "T-004", name: "Pooja Rao", phone: "+91 98765 00005", type: "Normal", priority: "Normal",
      status: "Waiting", date: todayStr, registeredAt: "10:15 AM", position: 1,
      doctorId: drPatel.id, roomId: room2.id,
    },
  });

  // Room 3 (Dr. Amit Gupta) - Completed patient today and one waiting patient
  await prisma.patient.create({
    data: {
      token: "T-005", name: "Ananya Panday", phone: "+91 98765 00006", type: "Normal", priority: "Normal",
      status: "Completed", date: todayStr, registeredAt: "10:00 AM", position: -1,
      doctorId: drGupta.id, roomId: room3.id,
      consultationStartedAt: new Date(new Date().setHours(10, 0, 0)),
      consultationEndedAt: new Date(new Date().setHours(10, 10, 0)),
      consultationDuration: 600,
    },
  });
  await prisma.patient.create({
    data: {
      token: "T-006", name: "Rahul Gandhi", phone: "+91 98765 00007", type: "Normal", priority: "Normal",
      status: "In Consultation", date: todayStr, registeredAt: "10:15 AM", position: 0,
      doctorId: drGupta.id, roomId: room3.id, consultationStartedAt: new Date(),
    },
  });

  // Room 4 (Dr. Neha Verma) - Clean waiting queue to demonstrate auto-promotion on reload
  await prisma.patient.create({
    data: {
      token: "T-007", name: "Narendra Modi", phone: "+91 98765 00008", type: "Normal", priority: "Normal",
      status: "Waiting", date: todayStr, registeredAt: "10:30 AM", position: 0,
      doctorId: drVerma.id, roomId: room4.id,
    },
  });
  await prisma.patient.create({
    data: {
      token: "T-008", name: "Arvind Kejriwal", phone: "+91 98765 00009", type: "Normal", priority: "Normal",
      status: "Waiting", date: todayStr, registeredAt: "10:45 AM", position: 1,
      doctorId: drVerma.id, roomId: room4.id,
    },
  });

  // Room 5 (Dr. Arjun Singh) - Cancelled and transferred patient logs
  await prisma.patient.create({
    data: {
      token: "T-009-TR-12345", name: "Mamata Banerjee", phone: "+91 98765 00010", type: "Normal", priority: "Normal",
      status: "Transferred", date: todayStr, registeredAt: "11:00 AM", position: -1,
      doctorId: drSingh.id, roomId: room5.id,
    },
  });
  await prisma.patient.create({
    data: {
      token: "T-010", name: "Mayawati Kumari", phone: "+91 98765 00011", type: "Normal", priority: "Normal",
      status: "Cancelled", date: todayStr, registeredAt: "11:15 AM", position: -1,
      doctorId: drSingh.id, roomId: room5.id,
    },
  });
  await prisma.patient.create({
    data: {
      token: "T-011", name: "Akhilesh Yadav", phone: "+91 98765 00012", type: "Normal", priority: "Normal",
      status: "In Consultation", date: todayStr, registeredAt: "11:30 AM", position: 0,
      doctorId: drSingh.id, roomId: room5.id, consultationStartedAt: new Date(),
    },
  });

  console.log("Seeded active queues, completed consultations, transferred and cancelled patient records.");
  console.log("Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
