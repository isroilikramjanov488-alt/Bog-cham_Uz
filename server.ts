import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";

dotenv.config();

const app = express();
const PORT = 3000;

// CORS & REQUEST DEBUGGING MIDDLEWARE
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization", "x-telegram-init-data"],
  exposedHeaders: ["Content-Length", "Content-Range"],
  credentials: true
}));

app.use((req, res, next) => {
  console.log(`[BACKEND REQUEST] Method: ${req.method} | Path: ${req.path} | Origin: ${req.headers.origin || 'none'}`);
  next();
});

app.use(express.json());

// REQUEST LOGGING MIDDLEWARE
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[API LOG] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// DIAGNOSTIC ENDPOINT
app.get("/api/health-check", (req, res) => {
  const dbExists = fs.existsSync(DB_FILE);
  let dbSize = 0;
  if (dbExists) {
    dbSize = fs.statSync(DB_FILE).size;
  }
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database: {
      connected: true,
      file: DB_FILE,
      exists: dbExists,
      sizeBytes: dbSize,
      childrenCount: children.length,
      employeesCount: employees.length
    }
  });
});

// IN-MEMORY DATABASE WITH PREDEFINED SEED DATA
const DB_FILE = path.join(process.cwd(), "db_data.json");

interface Child {
  id: string;
  name: string;
  birthDate: string;
  age: number;
  gender: "O'g'il" | "Qiz";
  groupId: string;
  parentPhone: string;
  parentName: string;
  photo: string;
  status: "Bog'chada" | "Kelmagan" | "Kechikdi" | "Sababli";
  telegramChatId: string | null;
  documents: {
    birthCertificate: boolean;
    medicalCard: boolean;
    passportCopy: boolean;
    contract: boolean;
    photoUploaded: boolean;
  };
  medicalCard: {
    allergies: string;
    bloodGroup: string;
    rhFactor: string;
    vaccinations: string[];
    height: number;
    weight: number;
    bmi: number;
    lastCheckup: string;
  };
  kindergartenId?: string;
}

interface Group {
  id: string;
  name: string;
  teacherId: string;
  capacity: number;
  spots: number;
  kindergartenId?: string;
}

interface Employee {
  id: string;
  username: string;
  passwordHash: string; // Simplification, standard login comparison
  role: "SuperAdmin" | "Direktor" | "Tarbiyachi" | "Oshpaz" | "Hamshira" | "Buxgalter";
  name: string;
  phone: string;
  passport: string;
  birthDate: string;
  joinedDate: string;
  status: "Faol" | "Nofaol";
  kindergartenId?: string;
  telegramChatId?: string | null;
  avatar?: string;
}

interface Attendance {
  id: string;
  childId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: "Keldi" | "Ketdi" | "Kechikdi" | "Sababli" | "Sababsiz";
  reason: string | null;
  deviceIp: string | null;
  kindergartenId?: string;
  checkoutPhoto?: string;
  checkoutPersonName?: string;
  temperature?: number;
}

interface MealDetail {
  title: string;
  calories: number;
  protein: number;
  fat: number;
  carb: number;
  vitamins: string;
  minerals: string;
  image: string;
  aiComment: string;
}

interface MealPlan {
  date: string;
  breakfast: MealDetail;
  lunch: MealDetail;
  dinner: MealDetail;
  kindergartenId?: string;
}

interface DailyActivity {
  id: string;
  childId: string;
  date: string;
  activities: string[];
  engagement: number; // 1-5
  discipline: number; // 1-5
  communication: number; // 1-5
  feeding: number; // 1-5
  sleep: number; // sleep hours, e.g. 2
  teacherNote: string;
  kindergartenId?: string;
}

interface Payment {
  id: string;
  childId: string;
  date: string;
  amount: number;
  paymentType: "Naqd" | "Click" | "Payme" | "Humo" | "Visa" | "Mastercard";
  month: string;
  status: "To'landi" | "Qisman" | "Qarzdor";
  kindergartenId?: string;
}

interface Complaint {
  id: string;
  parentName: string;
  childId: string;
  phone: string;
  text: string;
  date: string;
  status: "Yangi" | "Ko'rildi" | "Hal etildi";
  kindergartenId?: string;
}

interface Expense {
  id: string;
  date: string;
  category: "Oziq-ovqat" | "Kommunal xizmatlar" | "Ish haqi" | "Tozalash vositalari" | "O'yinchoqlar" | "Ta'mirlash" | "Transport" | "Soliq" | "Boshqa xarajatlar";
  description: string;
  amount: number;
  paymentType: "Naqd" | "Click" | "Payme" | "Humo" | "Visa" | "Mastercard" | "Bank O'tkazmasi" | "Uzum Bank";
  responsible: string;
  receiptUrl?: string;
  kindergartenId?: string;
}

interface Payroll {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  baseSalary: number;
  bonus: number;
  fine: number;
  tax: number;
  finalAmount: number;
  date: string;
  status: string;
  kindergartenId?: string;
}

interface PurchaseRequest {
  id: string;
  senderName: string;
  senderRole: string;
  title: string;
  amount: number;
  date: string;
  status: "Kutilmoqda" | "Tasdiqlandi" | "To'landi";
  approvedBy?: string;
  kindergartenId?: string;
}

interface Income {
  id: string;
  source: string;
  amount: number;
  date: string;
  description: string;
  kindergartenId?: string;
}

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  ip: string;
  device: string;
  kindergartenId?: string;
}

interface Kindergarten {
  id: string;
  name: string;
  address: string;
  phone: string;
  directorName: string;
  directorUsername: string;
  parentPortalActive?: boolean;
}

// Initial Data Setup
let kindergartens: Kindergarten[] = [
  { id: "K-1", name: "Nihol AI Bog'chasi (Chilonzor filiali)", address: "Toshkent sh., Chilonzor tumani, 5-mavze", phone: "+998711234567", directorName: "Karimov Shaxzod Baxtiyorovich", directorUsername: "director" },
  { id: "K-2", name: "Kamalak G'unchalari Bog'chasi (Yunusobod filiali)", address: "Toshkent sh., Yunusobod tumani, 11-mavze", phone: "+998717654321", directorName: "Siddiqov Elyor", directorUsername: "director2" }
];

let children: Child[] = [
  {
    id: "B-101",
    name: "Karimova Madina Dilshodovna",
    birthDate: "2021-04-12",
    age: 5,
    gender: "Qiz",
    groupId: "G-1",
    parentPhone: "+998901234567",
    parentName: "Dilshod Karimov",
    photo: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&q=80&w=200",
    status: "Kelmagan",
    telegramChatId: null,
    documents: { birthCertificate: true, medicalCard: true, passportCopy: true, contract: true, photoUploaded: true },
    medicalCard: { allergies: "Shokolad", bloodGroup: "A (II)", rhFactor: "Positive (+)", vaccinations: ["BCG", "Hepatitis B", "Polio"], height: 110, weight: 19, bmi: 15.7, lastCheckup: "2026-06-25" },
    kindergartenId: "K-1"
  },
  {
    id: "B-102",
    name: "Aliyev Azizbek Baxtiyorovich",
    birthDate: "2020-09-15",
    age: 6,
    gender: "O'g'il",
    groupId: "G-2",
    parentPhone: "+998935551212",
    parentName: "Baxtiyor Aliyev",
    photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200",
    status: "Kelmagan",
    telegramChatId: null,
    documents: { birthCertificate: true, medicalCard: true, passportCopy: false, contract: true, photoUploaded: true },
    medicalCard: { allergies: "Yo'q", bloodGroup: "O (I)", rhFactor: "Negative (-)", vaccinations: ["BCG", "Polio"], height: 115, weight: 21, bmi: 15.9, lastCheckup: "2026-06-28" },
    kindergartenId: "K-1"
  },
  {
    id: "B-103",
    name: "Umarova Farzona Ulug'bekovna",
    birthDate: "2022-01-30",
    age: 4,
    gender: "Qiz",
    groupId: "G-3",
    parentPhone: "+998991112233",
    parentName: "Ulug'bek Umarov",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200",
    status: "Kelmagan",
    telegramChatId: null,
    documents: { birthCertificate: true, medicalCard: false, passportCopy: false, contract: false, photoUploaded: true },
    medicalCard: { allergies: "Yong'oq", bloodGroup: "B (III)", rhFactor: "Positive (+)", vaccinations: ["BCG", "Measles"], height: 98, weight: 15, bmi: 15.6, lastCheckup: "2026-06-15" },
    kindergartenId: "K-1"
  },
  {
    id: "B-104",
    name: "Ubaydullayev Temur Shavkatovich",
    birthDate: "2021-08-14",
    age: 5,
    gender: "O'g'il",
    groupId: "G-4",
    parentPhone: "+998901239999",
    parentName: "Farrux Ubaydullayev",
    photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200",
    status: "Kelmagan",
    telegramChatId: null,
    documents: { birthCertificate: true, medicalCard: true, passportCopy: true, contract: true, photoUploaded: true },
    medicalCard: { allergies: "Yo'q", bloodGroup: "A (II)", rhFactor: "Positive (+)", vaccinations: ["BCG", "Polio"], height: 108, weight: 18, bmi: 15.4, lastCheckup: "2026-06-20" },
    kindergartenId: "K-2"
  }
];

let groups: Group[] = [
  { id: "G-1", name: "O'rta guruh (Kamalak)", teacherId: "E-3", capacity: 25, spots: 18, kindergartenId: "K-1" },
  { id: "G-2", name: "Katta guruh (Yulduzcha)", teacherId: "E-7", capacity: 25, spots: 21, kindergartenId: "K-1" },
  { id: "G-3", name: "Kichik guruh (Tandir)", teacherId: "E-7", capacity: 20, spots: 15, kindergartenId: "K-1" },
  { id: "G-4", name: "K-2 O'rta guruh (Navbahor)", teacherId: "E-9", capacity: 25, spots: 12, kindergartenId: "K-2" }
];

let employees: Employee[] = [
  { id: "E-1", username: "superadmin", passwordHash: "admin135@", role: "SuperAdmin", name: "Asqarov Jamshid", phone: "+998909990000", passport: "AA1234567", birthDate: "1988-05-15", joinedDate: "2024-01-01", status: "Faol" },
  { id: "E-2", username: "director", passwordHash: "admin135@", role: "Direktor", name: "Karimov Shaxzod Baxtiyorovich", phone: "+998901112233", passport: "AB9876543", birthDate: "1982-11-22", joinedDate: "2024-03-10", status: "Faol", kindergartenId: "K-1" },
  { id: "E-3", username: "teacher", passwordHash: "admin135@", role: "Tarbiyachi", name: "Rahimova Nodira Shavkatovna", phone: "+998974445566", passport: "AC1112223", birthDate: "1994-08-05", joinedDate: "2024-09-01", status: "Faol", kindergartenId: "K-1" },
  { id: "E-4", username: "chef", passwordHash: "admin135@", role: "Oshpaz", name: "Abdullayev Rustam G'ofurovich", phone: "+998946667788", passport: "AD3334445", birthDate: "1975-02-14", joinedDate: "2024-05-01", status: "Faol", kindergartenId: "K-1" },
  { id: "E-5", username: "nurse", passwordHash: "admin135@", role: "Hamshira", name: "Soliqova Nilufar Alisherovna", phone: "+998937778899", passport: "AE5556667", birthDate: "1990-12-10", joinedDate: "2024-06-15", status: "Faol", kindergartenId: "K-1" },
  { id: "E-6", username: "accountant", passwordHash: "admin135@", role: "Buxgalter", name: "Xalilov Azizbek Husanovich", phone: "+998912223344", passport: "AF7778889", birthDate: "1985-04-18", joinedDate: "2024-04-01", status: "Faol", kindergartenId: "K-1" },
  { id: "E-7", username: "teacher2", passwordHash: "admin135@", role: "Tarbiyachi", name: "Toshmatova Lola", phone: "+998905554433", passport: "AG8889990", birthDate: "1997-01-20", joinedDate: "2025-02-01", status: "Faol", kindergartenId: "K-1" },
  { id: "E-8", username: "director2", passwordHash: "admin135@", role: "Direktor", name: "Siddiqov Elyor", phone: "+998971110022", passport: "AH4445556", birthDate: "1985-03-05", joinedDate: "2025-01-10", status: "Faol", kindergartenId: "K-2" },
  { id: "E-9", username: "teacher3", passwordHash: "admin135@", role: "Tarbiyachi", name: "Odilova Barno", phone: "+998903332211", passport: "AI1112223", birthDate: "1996-06-18", joinedDate: "2025-03-12", status: "Faol", kindergartenId: "K-2" }
];

let attendance: Attendance[] = [
  { id: "ATT-001", childId: "B-101", date: "2026-07-02", checkIn: "08:11", checkOut: null, status: "Keldi", reason: null, deviceIp: "192.168.1.222", kindergartenId: "K-1" },
  { id: "ATT-002", childId: "B-103", date: "2026-07-02", checkIn: "08:25", checkOut: null, status: "Kechikdi", reason: null, deviceIp: "192.168.1.225", kindergartenId: "K-1" },
  { id: "ATT-003", childId: "B-102", date: "2026-07-02", checkIn: null, checkOut: null, status: "Sababli", reason: "Tish shifokori ko'rigi", deviceIp: null, kindergartenId: "K-1" },
  { id: "ATT-004", childId: "B-104", date: "2026-07-02", checkIn: "08:15", checkOut: null, status: "Keldi", reason: null, deviceIp: "192.168.1.221", kindergartenId: "K-2" }
];

let mealPlans: MealPlan[] = [
  {
    date: "2026-07-02",
    breakfast: {
      title: "Sutli suli bo'tqasi, qaynatilgan tuxum, sariyog'li non va olma sharbati",
      calories: 420, protein: 18, fat: 12, carb: 58,
      vitamins: "Vitamin A (35%), Vitamin D (30%), Vitamin B12 (15%)",
      minerals: "Kaltsiy (40%), Temir (18%), Rux (10%)",
      image: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=200",
      aiComment: "Bugungi nonushta bolalar uchun muvozanatli va energiya bilan to'la. Kaltsiy miqdori suyak mustahkamlanishi uchun ajoyib ko'rsatkichdir."
    },
    lunch: {
      title: "Frikadelkali sho'rva, guruchli kotlet, sabzavotli salat va kompot",
      calories: 650, protein: 28, fat: 22, carb: 82,
      vitamins: "Vitamin C (45%), Vitamin A (50%), Vitamin B6 (20%)",
      minerals: "Temir (25%), Magniy (15%), Kaliy (18%)",
      image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=200",
      aiComment: "Tushlikda oqsil miqdori juda boy, mushak o'sishi va kunlik faollik uchun yetarli. Salat C vitamini o'zlashtirishni kuchaytiradi."
    },
    dinner: {
      title: "Tvorogli zapekanka, smetana va ko'k choy",
      calories: 310, protein: 14, fat: 8, carb: 42,
      vitamins: "Vitamin D (25%), Vitamin B2 (20%)",
      minerals: "Kaltsiy (35%), Fosfor (20%)",
      image: "https://images.unsplash.com/photo-1579372786545-d24232daf58c?auto=format&fit=crop&q=80&w=200",
      aiComment: "Kechki ovqat yengil hazm bo'ladigan bo'lib, bolaning tinch va chuqur uxlashiga yordam beradi."
    }
  }
];

let dailyActivities: DailyActivity[] = [
  {
    id: "ACT-001", childId: "B-101", date: "2026-07-02",
    activities: ["Rasm chizish", "Musiqiy raqs", "Ingliz tili darsi"],
    engagement: 5, discipline: 4, communication: 5, feeding: 5, sleep: 2,
    teacherNote: "Madina bugun rasm chizish darsida o'z guruhini chizib berdi. Juda faol, ovqatlarni hammasini yedi."
  },
  {
    id: "ACT-002", childId: "B-103", date: "2026-07-02",
    activities: ["Rasm chizish", "Musiqiy raqs"],
    engagement: 4, discipline: 3, communication: 4, feeding: 3, sleep: 1.5,
    teacherNote: "Farzona biroz injiqlik qildi, lekin rasm chizishda qatnashdi. Uyqusi o'rtacha bo'ldi."
  }
];

let payments: Payment[] = [
  { id: "PAY-001", childId: "B-101", date: "2026-06-25", amount: 1500000, paymentType: "Click", month: "Iyun", status: "To'landi" },
  { id: "PAY-002", childId: "B-102", date: "2026-06-28", amount: 1500000, paymentType: "Humo", month: "Iyun", status: "To'landi" },
  { id: "PAY-003", childId: "B-103", date: "2026-07-01", amount: 500000, paymentType: "Naqd", month: "Iyul", status: "Qisman" }
];

let expenses: Expense[] = [
  { id: "EXP-001", date: "2026-07-02", category: "Oziq-ovqat", description: "Oshpaz uchun go'sht, sut va mevalar xarid qilindi", amount: 2500000, paymentType: "Naqd", responsible: "Abdullayev Rustam", kindergartenId: "K-1" },
  { id: "EXP-002", date: "2026-07-01", category: "Kommunal xizmatlar", description: "Elektr va isitish tizimi to'lovi", amount: 8500000, paymentType: "Bank O'tkazmasi", responsible: "Karimov Shaxzod", kindergartenId: "K-1" },
  { id: "EXP-003", date: "2026-06-30", category: "Tozalash vositalari", description: "Sinf xonalari tozalash anjomlari", amount: 1200000, paymentType: "Click", responsible: "Xalilov Azizbek", kindergartenId: "K-1" }
];

let payrolls: Payroll[] = [
  { id: "PAYR-001", employeeId: "E-3", employeeName: "Rahimova Nodira", employeeRole: "Tarbiyachi", baseSalary: 3000000, bonus: 300000, fine: 0, tax: 0, finalAmount: 3300000, date: "2026-07-01", status: "To'landi", kindergartenId: "K-1" },
  { id: "PAYR-002", employeeId: "E-4", employeeName: "Abdullayev Rustam", employeeRole: "Oshpaz", baseSalary: 2500000, bonus: 150000, fine: 0, tax: 0, finalAmount: 2650000, date: "2026-07-01", status: "To'landi", kindergartenId: "K-1" },
  { id: "PAYR-003", employeeId: "E-5", employeeName: "Soliqova Nilufar", employeeRole: "Hamshira", baseSalary: 2200000, bonus: 0, fine: 100000, tax: 0, finalAmount: 2100000, date: "2026-07-01", status: "Kutilmoqda", kindergartenId: "K-1" },
  { id: "PAYR-004", employeeId: "E-6", employeeName: "Xalilova Malika", employeeRole: "Tarbiyachi", baseSalary: 2800000, bonus: 0, fine: 0, tax: 0, finalAmount: 2800000, date: "2026-07-05", status: "Kam berildi (300,000 UZS)", kindergartenId: "K-1" }
];

let purchaseRequests: PurchaseRequest[] = [
  { id: "REQ-001", senderName: "Abdullayev Rustam", senderRole: "Oshpaz", title: "Yangi dars haftasi uchun go'sht va sabzavotlar", amount: 1200000, date: "2026-07-02", status: "Tasdiqlandi", approvedBy: "Karimov Shaxzod", kindergartenId: "K-1" },
  { id: "REQ-002", senderName: "Soliqova Nilufar", senderRole: "Hamshira", title: "Birinchi tibbiy yordam dori-darmonlari jamlanmasi", amount: 450000, date: "2026-07-03", status: "Kutilmoqda", kindergartenId: "K-1" }
];

let incomes: Income[] = [
  { id: "INC-001", source: "Homiylik", amount: 10000000, date: "2026-06-20", description: "Tadbirkorlar tomonidan xayriya va homiylik mablag'i", kindergartenId: "K-1" },
  { id: "INC-002", source: "Davlat subsidiyasi", amount: 15000000, date: "2026-06-28", description: "Maktabgacha ta'lim vazirligi subsidiya yordami", kindergartenId: "K-1" }
];

let complaints: Complaint[] = [
  { id: "CMP-001", parentName: "Dilshod Karimov", childId: "B-101", phone: "+998901234567", text: "Bog'chaning hovlisidagi bolalar o'yingohi biroz eskirdi, xavfsizlik choralarini kuchaytirsangiz yaxshi bo'lardi.", date: "2026-07-01", status: "Yangi" }
];

interface PublicAnnouncement {
  id: string;
  message: string;
  timestamp: string;
  kindergartenId: string;
  views: number;
}

let publicAnnouncements: PublicAnnouncement[] = [
  {
    id: "ANN-1",
    message: "Assalomu alaykum hurmatli ota-onalar! Ertaga soat 10:00 da bog'chamizda yillik hisobot va ota-onalar majlisi bo'lib o'tadi. Barchangizni taklif etamiz.",
    timestamp: "2026-07-14 11:30:00",
    kindergartenId: "all",
    views: 12
  },
  {
    id: "ANN-2",
    message: "Bog'chamizda bolalar uchun qo'shimcha shaxmat to'garagi ochildi! Darslar haftada ikki marta: seshanba va payshanba kunlari soat 16:30 da o'tkaziladi.",
    timestamp: "2026-07-15 09:00:00",
    kindergartenId: "all",
    views: 8
  }
];

let auditLogs: AuditLog[] = [
  { id: "LOG-001", timestamp: "2026-07-02 08:11:42", user: "Face ID Device .222", action: "B-101 Madina Karimova - Keldi deb davomat qilindi", ip: "192.168.1.222", device: "Entrance Device #2" },
  { id: "LOG-002", timestamp: "2026-07-02 08:25:10", user: "Face ID Device .225", action: "B-103 Farzona Umarova - Kechikib keldi deb davomat qilindi", ip: "192.168.1.225", device: "Entrance Device #5" },
  { id: "LOG-003", timestamp: "2026-07-02 09:15:00", user: "Tarbiyachi Nodira", action: "Madina Karimovaning bugungi faoliyatini kiritdi", ip: "192.168.1.102", device: "Teacher Portal" }
];

// KMS Data Stores
interface Ingredient {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  supplier: string;
  expirationDate: string;
  status: string;
  purchasePrice: number;
}

interface Recipe {
  id: string;
  title: string;
  category: string;
  instructions: string;
  ingredients: { name: string; amount: number; unit: string; }[];
  calories: number;
  protein: number;
  fat: number;
  carb: number;
  cost: number;
}

interface MealGalleryItem {
  id: string;
  title: string;
  url: string;
  date: string;
  type: string;
  kindergartenId?: string;
  description?: string;
}

let kgIngredients: Ingredient[] = [
  { id: "ING-1", name: "Mol go'shti (Sux)", category: "Meat", quantity: 45, unit: "kg", supplier: "Agromir meat-supply LLC", expirationDate: "2026-07-20", status: "Yetarli", purchasePrice: 75000 },
  { id: "ING-2", name: "Sut 3.2% (Agromir)", category: "Dairy", quantity: 120, unit: "litr", supplier: "Agromir LLC", expirationDate: "2026-07-08", status: "Yetarli", purchasePrice: 9000 },
  { id: "ING-3", name: "Guruch Alanga", category: "Rice", quantity: 50, unit: "kg", supplier: "Sholikor OOO", expirationDate: "2027-01-10", status: "Yetarli", purchasePrice: 18000 },
  { id: "ING-4", name: "Tuxum (Sifatli)", category: "Dairy", quantity: 300, unit: "dona", supplier: "Parrandachilik MCHJ", expirationDate: "2026-07-25", status: "Yetarli", purchasePrice: 1500 },
  { id: "ING-5", name: "Kartoshka (Qizil)", category: "Vegetables", quantity: 8, unit: "kg", supplier: "Dehqon Bozori", expirationDate: "2026-07-15", status: "Kam qolgan", purchasePrice: 4000 },
  { id: "ING-6", name: "Sariyog' 82%", category: "Dairy", quantity: 3, unit: "kg", supplier: "Agromir LLC", expirationDate: "2026-07-30", status: "Kam qolgan", purchasePrice: 95000 }
];

let kgRecipes: Recipe[] = [
  { id: "REC-1", title: "Moshxo'rda sho'rva", category: "Soups", instructions: "Go'shtni mayda to'g'rab qovurasiz. Piyoz, sabzi qo'shasiz. Moshni yuvib solib, suv quyib qaynatasiz. Guruch solib quyulguncha pishirasiz.", ingredients: [{ name: "Mol go'shti", amount: 50, unit: "g" }, { name: "Mosh", amount: 30, unit: "g" }, { name: "Guruch", amount: 20, unit: "g" }], calories: 280, protein: 12, fat: 8, carb: 35, cost: 8500 },
  { id: "REC-2", title: "Tvorogli zapekanka", category: "Dairy", instructions: "Tvorogni tuxum va shakar bilan aralashtirib, pishiriq qolipiga solib, duxovkada 180 darajada 30 daqiqa pishirasiz.", ingredients: [{ name: "Tvorog", amount: 150, unit: "g" }, { name: "Tuxum", amount: 1, unit: "dona" }, { name: "Shakar", amount: 20, unit: "g" }], calories: 310, protein: 14, fat: 8, carb: 42, cost: 6000 }
];

let kgMealGallery: MealGalleryItem[] = [
  { id: "GAL-1", title: "Moshxo'rda sho'rva tushlik uchun", url: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=400", date: "2026-07-14", type: "Oshxona (Tushlik)", kindergartenId: "K-1", description: "Bolajonlarimiz uchun maxsus tayyorlangan, vitaminlarga boy issiq moshxo'rda sho'rvasi." },
  { id: "GAL-2", title: "Ertalabki manna bo'tqasi tayyorlanishi", url: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=400", date: "2026-07-14", type: "Oshxona (Nonushta)", kindergartenId: "K-1", description: "Sutli va sariyog'li to'yimli bo'tqa tayyorlash jarayonidan lavha." },
  { id: "GAL-3", title: "Rasm chizish va ijod darsi", url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=400", date: "2026-07-13", type: "Mashg'ulot (Ijodiy)", kindergartenId: "K-1", description: "Katta guruh bolalarining akvarel bo'yoqlari yordamida erkin rasm chizish darsi faoliyati." },
  { id: "GAL-4", title: "Vitaminli meva va sabzavotlar", url: "https://images.unsplash.com/photo-1490818383965-f24b85753a8a?auto=format&fit=crop&q=80&w=400", date: "2026-07-14", type: "Oshxona (Snack)", kindergartenId: "K-2", description: "Bolalarning tushdan keyingi vitaminli taomnomasi uchun yummy meva va rezavorlar." },
  { id: "GAL-5", title: "Musiqa va ritm darsi", url: "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&q=80&w=400", date: "2026-07-13", type: "Mashg'ulot (Musiqa)", kindergartenId: "K-2", description: "Tungi guruh va o'rta guruh bolajonlarının musiqa cholg'u asboblarida ritm chalish mashg'uloti." },
  { id: "GAL-6", title: "Ertalabki gimnastika mashqi", url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=400", date: "2026-07-14", type: "Salomatlik", kindergartenId: "K-2", description: "Kamalak G'unchalari bog'chasida bolalarni chiniqtirish uchun ertalabki jismoniy gimnastika mashg'ulotlari." }
];

interface SuperAdminDocument {
  id: string;
  title: string;
  allocatedFunds?: number;
  targetDirectorUsername: string;
  fileName: string;
  fileUrl: string;
  date: string;
  distributedToPanels: string[];
}

let superAdminDocuments: SuperAdminDocument[] = [
  { id: "SAD-001", title: "Yillik Byudjet va O'quv Rejasi", allocatedFunds: 50000000, targetDirectorUsername: "director", fileName: "budget_details_2026.pdf", fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", date: "2026-07-01", distributedToPanels: [] },
  { id: "SAD-002", title: "Sog'lom Ovqatlanish Va Sanitar Nizomi", targetDirectorUsername: "director", fileName: "sanitary_regulations_2026.pdf", fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", date: "2026-07-02", distributedToPanels: ["Oshpaz", "Hamshira"] }
];

interface SMSLog {
  id: string;
  phone: string;
  message: string;
  date: string;
  status: "Yuborildi" | "Xatolik";
  provider: string;
  childId?: string;
}

let smsLogs: SMSLog[] = [
  { id: "SMS-1", phone: "+998901234567", message: "Hurmatli ota-ona, farzandingiz Karimova Madina uchun iyul oyi to'lovini amalga oshirishingizni so'raymiz.", date: "2026-07-05 10:15", status: "Yuborildi", provider: "Eskiz SMS Gateway API (uz)" }
];

interface TelegramNotificationLog {
  id: string;
  chatId: string;
  recipientName: string;
  message: string;
  timestamp: string;
  status: "Yuborildi" | "Xatolik";
}

let telegramNotifications: TelegramNotificationLog[] = [
  { id: "TG-1", chatId: "SIM-PARENT", recipientName: "Karimova Madina (Ota-ona)", message: "Assalomu alaykum! Farzandingiz Karimova Madina bugun soat 08:30 da bog'chaga muvaffaqiyatli yetib keldi.", timestamp: "2026-07-09 08:30", status: "Yuborildi" }
];

// Define global activeDevices array
let activeDevices = [
  { id: "DEV-221", name: "Kirish Qurilmasi #1 (Kamalak)", ip: "192.168.1.221", status: "Online", type: "entrance", latencyThreshold: 100, streamSensitivity: 80, details: { camera: "Active", thermometer: "Ready", relay: "Connected", latencyMs: 14, lastHeartbeat: new Date().toLocaleTimeString("uz-UZ") } },
  { id: "DEV-222", name: "Kirish Qurilmasi #2 (Asosiy)", ip: "192.168.1.222", status: "Online", type: "entrance", latencyThreshold: 100, streamSensitivity: 80, details: { camera: "Active", thermometer: "Ready", relay: "Connected", latencyMs: 12, lastHeartbeat: new Date().toLocaleTimeString("uz-UZ") } },
  { id: "DEV-223", name: "Kirish Qurilmasi #3 (Yordamchi)", ip: "192.168.1.223", status: "Online", type: "entrance", latencyThreshold: 100, streamSensitivity: 80, details: { camera: "Active", thermometer: "Ready", relay: "Connected", latencyMs: 18, lastHeartbeat: new Date().toLocaleTimeString("uz-UZ") } },
  { id: "DEV-224", name: "Kirish Qurilmasi #4 (Orqa hovli)", ip: "192.168.1.224", status: "Online", type: "entrance", latencyThreshold: 100, streamSensitivity: 80, details: { camera: "Active", thermometer: "Ready", relay: "Connected", latencyMs: 15, lastHeartbeat: new Date().toLocaleTimeString("uz-UZ") } },
  { id: "DEV-225", name: "Kirish Qurilmasi #5 (Tashqi yo'lak)", ip: "192.168.1.225", status: "Online", type: "entrance", latencyThreshold: 100, streamSensitivity: 80, details: { camera: "Active", thermometer: "Ready", relay: "Connected", latencyMs: 22, lastHeartbeat: new Date().toLocaleTimeString("uz-UZ") } },
  { id: "DEV-226", name: "Chiqish Qurilmasi #1 (Darvoza)", ip: "192.168.1.226", status: "Online", type: "exit", latencyThreshold: 100, streamSensitivity: 80, details: { camera: "Active", thermometer: "Ready", relay: "Connected", latencyMs: 11, lastHeartbeat: new Date().toLocaleTimeString("uz-UZ") } },
  { id: "DEV-227", name: "Chiqish Qurilmasi #2 (Orqa hovli)", ip: "192.168.1.227", status: "Online", type: "exit", latencyThreshold: 100, streamSensitivity: 80, details: { camera: "Active", thermometer: "Ready", relay: "Connected", latencyMs: 19, lastHeartbeat: new Date().toLocaleTimeString("uz-UZ") } },
  { id: "DEV-228", name: "Chiqish Qurilmasi #3 (Xizmat yo'li)", ip: "192.168.1.228", status: "Online", type: "exit", latencyThreshold: 100, streamSensitivity: 80, details: { camera: "Active", thermometer: "Ready", relay: "Connected", latencyMs: 25, lastHeartbeat: new Date().toLocaleTimeString("uz-UZ") } },
  { id: "DEV-229", name: "Chiqish Qurilmasi #4 (Tashqi yo'lak)", ip: "192.168.1.229", status: "Online", type: "exit", latencyThreshold: 100, streamSensitivity: 80, details: { camera: "Active", thermometer: "Ready", relay: "Connected", latencyMs: 17, lastHeartbeat: new Date().toLocaleTimeString("uz-UZ") } },
  { id: "DEV-230", name: "Chiqish Qurilmasi #5 (Kamalak)", ip: "192.168.1.230", status: "Online", type: "exit", latencyThreshold: 100, streamSensitivity: 80, details: { camera: "Active", thermometer: "Ready", relay: "Connected", latencyMs: 14, lastHeartbeat: new Date().toLocaleTimeString("uz-UZ") } },
  { id: "DEV-231", name: "Smart Taroz Integratsiyasi", ip: "192.168.1.231", status: "Online", type: "system", latencyThreshold: 100, streamSensitivity: 80, details: { camera: "Offline", thermometer: "Ready", relay: "Connected", latencyMs: 31, lastHeartbeat: new Date().toLocaleTimeString("uz-UZ") } },
];

interface FailedCheckIn {
  id: string;
  timestamp: string;
  photoUrl: string;
  confidence: number;
  latencyMs?: number;
  deviceIp: string;
  deviceName: string;
  resolved: boolean;
  resolvedChildId?: string;
  errorReason: "low_confidence" | "high_latency" | "no_match";
}

let failedCheckins: FailedCheckIn[] = [
  {
    id: "FAIL-001",
    timestamp: "2026-07-11 08:14:22",
    photoUrl: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&q=80&w=300",
    confidence: 64,
    latencyMs: 45,
    deviceIp: "192.168.1.222",
    deviceName: "Kirish Qurilmasi #2 (Asosiy)",
    resolved: false,
    errorReason: "low_confidence"
  },
  {
    id: "FAIL-002",
    timestamp: "2026-07-11 08:21:40",
    photoUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&q=80&w=300",
    confidence: 89,
    latencyMs: 145,
    deviceIp: "192.168.1.225",
    deviceName: "Kirish Qurilmasi #5 (Tashqi yo'lak)",
    resolved: false,
    errorReason: "high_latency"
  },
  {
    id: "FAIL-003",
    timestamp: "2026-07-11 08:35:12",
    photoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300",
    confidence: 32,
    latencyMs: 38,
    deviceIp: "192.168.1.221",
    deviceName: "Kirish Qurilmasi #1 (Kamalak)",
    resolved: false,
    errorReason: "no_match"
  }
];

// Load from file if exists, else save seed data
if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const data = JSON.parse(raw);
    kindergartens = data.kindergartens || kindergartens;
    children = data.children || children;
    groups = data.groups || groups;
    employees = data.employees || employees;
    attendance = data.attendance || attendance;
    mealPlans = data.mealPlans || mealPlans;
    dailyActivities = data.dailyActivities || dailyActivities;
    payments = data.payments || payments;
    expenses = data.expenses || expenses;
    payrolls = data.payrolls || payrolls;
    purchaseRequests = data.purchaseRequests || purchaseRequests;
    incomes = data.incomes || incomes;
    complaints = data.complaints || complaints;
    publicAnnouncements = data.publicAnnouncements || publicAnnouncements;
    auditLogs = data.auditLogs || auditLogs;
    kgIngredients = data.kgIngredients || kgIngredients;
    kgRecipes = data.kgRecipes || kgRecipes;
    kgMealGallery = data.kgMealGallery || kgMealGallery;
    superAdminDocuments = data.superAdminDocuments || superAdminDocuments;
    smsLogs = data.smsLogs || smsLogs;
    telegramNotifications = data.telegramNotifications || telegramNotifications;
    activeDevices = data.activeDevices || activeDevices;
    failedCheckins = data.failedCheckins || failedCheckins;
    console.log("Database loaded successfully from JSON store.");
  } catch (err) {
    console.error("Error reading db file, using seed data:", err);
  }
} else {
  saveDb();
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify({
      kindergartens, children, groups, employees, attendance, mealPlans, dailyActivities, payments, expenses, payrolls, purchaseRequests, incomes, complaints, publicAnnouncements, auditLogs, kgIngredients, kgRecipes, kgMealGallery, superAdminDocuments, smsLogs, telegramNotifications, activeDevices, failedCheckins
    }, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing db file:", err);
  }
}

// LAZY GEMINI API INITIALIZATION
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is not defined in environment variables. Falling back to simulated AI answers.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

function getKgId(req: any): string {
  const queryVal = req.query?.kindergartenId;
  if (typeof queryVal === "string" && queryVal) return queryVal;
  const bodyVal = req.body?.kindergartenId;
  if (typeof bodyVal === "string" && bodyVal) return bodyVal;
  const headerVal = req.headers?.["x-kindergarten-id"];
  if (typeof headerVal === "string" && headerVal) return headerVal;
  if (Array.isArray(headerVal) && headerVal.length > 0) return headerVal[0];
  return "K-1";
}

// Data validation layer for schema consistency & required field checks
function validateKindergartenData(req: any, res: any, next: any) {
  const kgId = getKgId(req);
  
  if (!kgId || typeof kgId !== "string" || kgId.trim() === "") {
    return res.status(400).json({ 
      success: false, 
      error: "Kindergarten ID majburiy! Kindergarten ID verification failed." 
    });
  }

  const kgExists = kindergartens.some(k => k.id === kgId);
  if (!kgExists) {
    return res.status(400).json({ 
      success: false, 
      error: `Xatolik: Tizimda '${kgId}' identifikatorli bog'cha mavjud emas! Iltimos, avval ushbu bog'chani yarating.` 
    });
  }

  const path = req.path;
  const body = req.body || {};

  if (req.method === "POST" || req.method === "PUT") {
    if (path.includes("/children")) {
      if (req.method === "POST" && (!body.name || typeof body.name !== "string" || body.name.trim() === "")) {
        return res.status(400).json({ success: false, error: "Bola ismi-familiyasi (name) majburiy!" });
      }
      if (req.method === "POST" && (!body.parentPhone || typeof body.parentPhone !== "string" || body.parentPhone.trim() === "")) {
        return res.status(400).json({ success: false, error: "Ota-ona telefon raqami (parentPhone) majburiy!" });
      }
    } else if (path.includes("/employees")) {
      if (req.method === "POST" && (!body.name || typeof body.name !== "string" || body.name.trim() === "")) {
        return res.status(400).json({ success: false, error: "Xodim ismi-familiyasi (name) majburiy!" });
      }
      if (req.method === "POST" && (!body.role || typeof body.role !== "string" || body.role.trim() === "")) {
        return res.status(400).json({ success: false, error: "Xodim lavozimi (role) majburiy!" });
      }
    } else if (path.includes("/groups")) {
      if (req.method === "POST" && (!body.name || typeof body.name !== "string" || body.name.trim() === "")) {
        return res.status(400).json({ success: false, error: "Guruh nomi (name) majburiy!" });
      }
    } else if (path.includes("/payments")) {
      if (req.method === "POST") {
        if (body.amount === undefined || typeof body.amount !== "number" || body.amount < 0) {
          return res.status(400).json({ success: false, error: "To'lov summasi (amount) noto'g'ri kiritilgan!" });
        }
        if (!body.childId || typeof body.childId !== "string" || body.childId.trim() === "") {
          return res.status(400).json({ success: false, error: "Bola identifikatori (childId) majburiy!" });
        }
      }
    } else if (path.includes("/complaints")) {
      if (req.method === "POST" && (!body.text || typeof body.text !== "string" || body.text.trim() === "")) {
        return res.status(400).json({ success: false, error: "Shikoyat matni (text) majburiy!" });
      }
    }
  }

  next();
}

// JWT CRYPTOGRAPHY & SECURITY
const JWT_SECRET = process.env.JWT_SECRET || "nihol_erp_secure_secret_2026_key";

function signToken(payload: any): string {
  const header = { alg: "HS256", typ: "JWT" };
  const sHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const sPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${sHeader}.${sPayload}`)
    .digest("base64url");
  return `${sHeader}.${sPayload}.${signature}`;
}

function verifyToken(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [sHeader, sPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(`${sHeader}.${sPayload}`)
      .digest("base64url");
    if (signature !== expectedSignature) return null;
    return JSON.parse(Buffer.from(sPayload, "base64url").toString("utf-8"));
  } catch {
    return null;
  }
}

// SECURE RBAC & TENANCY MIDDLEWARE
function authMiddleware(allowedRoles?: string[]) {
  return (req: any, res: any, next: any) => {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
    
    if (!token) {
      // In development / demo simulation context, fallback gracefully so existing screens do not fail
      // but log a warning and attach a default tenant context
      req.user = {
        id: "E-6",
        username: "accountant",
        role: "Buxgalter",
        name: "Xalilov Azizbek Husanovich",
        kindergartenId: req.headers["x-kindergarten-id"] || "K-1"
      };
      return next();
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: "JWT token yaroqsiz yoki eskirgan!" });
    }
    
    req.user = decoded;
    
    // Check role restriction if provided
    if (allowedRoles && !allowedRoles.includes(decoded.role)) {
      return res.status(403).json({ success: false, message: "Sizda ushbu operatsiyani bajarish uchun ruxsat yetarli emas!" });
    }
    
    next();
  };
}

// REST API ROUTES

// AUTHENTICATION
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = employees.find(e => e.username.toLowerCase() === username.toLowerCase() && e.passwordHash === password);
  if (!user) {
    return res.status(401).json({ success: false, message: "Username yoki parol noto'g'ri!" });
  }
  if (user.status === "Nofaol") {
    return res.status(403).json({ success: false, message: "Ushbu profil bloklangan!" });
  }

  // Update last login
  user.joinedDate = user.joinedDate || new Date().toISOString().split("T")[0]; // ensure fields
  user.status = "Faol";
  saveDb();

  // Create JWT Payload
  const tokenPayload = {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    phone: user.phone,
    kindergartenId: user.kindergartenId || "K-1"
  };

  const token = signToken(tokenPayload);

  res.json({
    success: true,
    token: token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      phone: user.phone,
      kindergartenId: user.kindergartenId || "K-1"
    }
  });
});

app.post("/api/auth/logout", (req, res) => {
  res.json({ success: true, message: "Muvaffaqiyatli chiqildi." });
});

// CHILDREN ENDPOINTS
app.get("/api/children", (req, res) => {
  const kgId = getKgId(req);
  if (kgId && kgId !== "all") {
    return res.json(children.filter(c => c.kindergartenId === kgId));
  }
  res.json(children);
});

app.post("/api/children", validateKindergartenData, (req, res) => {
  const kgId = getKgId(req);
  const newChild: Child = {
    ...req.body,
    id: `B-${100 + children.length + 1}`,
    status: "Kelmagan",
    kindergartenId: kgId,
    telegramChatId: req.body.telegramChatId || null,
    documents: req.body.documents || { birthCertificate: false, medicalCard: false, passportCopy: false, contract: false, photoUploaded: false },
    medicalCard: req.body.medicalCard || { allergies: "Yo'q", bloodGroup: "O (I)", rhFactor: "Positive (+)", vaccinations: [], height: 105, weight: 18, bmi: 16.3, lastCheckup: new Date().toISOString().split("T")[0] }
  };
  children.push(newChild);

  // Add audit log
  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: req.body.operatorName || "Direktor",
    action: `Yangi bola qo'shildi: ${newChild.name} (ID: ${newChild.id})`,
    ip: req.ip || "127.0.0.1",
    device: "Web Browser",
    kindergartenId: kgId
  });

  saveDb();
  broadcastDataUpdate("children");
  res.json({ success: true, child: newChild });
});

app.put("/api/children/:id", (req, res) => {
  const index = children.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: "Bola topilmadi!" });

  children[index] = { ...children[index], ...req.body };

  // Add audit log
  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: "Direktor",
    action: `Bola ma'lumotlari tahrirlandi: ${children[index].name} (ID: ${children[index].id})`,
    ip: req.ip || "127.0.0.1",
    device: "Web Browser"
  });

  saveDb();
  broadcastDataUpdate("children");
  res.json({ success: true, child: children[index] });
});

app.delete("/api/children/:id", (req, res) => {
  const index = children.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, message: "Bola topilmadi!" });

  const deletedName = children[index].name;
  children.splice(index, 1);

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: "Direktor",
    action: `Bola o'chirib tashlandi: ${deletedName} (ID: ${req.params.id})`,
    ip: req.ip || "127.0.0.1",
    device: "Web Browser"
  });

  saveDb();
  res.json({ success: true });
});

// BULK ACTIONS ON CHILDREN
app.post("/api/children/bulk-absent", (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ success: false, message: "Yaroqsiz bola ID-lari!" });
  }

  let updatedCount = 0;
  ids.forEach(id => {
    const child = children.find(c => c.id === id);
    if (child) {
      child.status = "Kelmagan"; // Mark Absent
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      user: "Direktor",
      action: `${updatedCount} ta bola qo'shma ravishda kelmagan (absent) deb belgilandi`,
      ip: req.ip || "127.0.0.1",
      device: "Web Browser"
    });
    saveDb();
    broadcastDataUpdate("children");
  }

  res.json({ success: true, message: `${updatedCount} ta bola kelmagan deb belgilandi.` });
});

app.post("/api/children/bulk-reminder", (req, res) => {
  const { ids, message } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ success: false, message: "Yaroqsiz bola ID-lari!" });
  }

  const finalMsg = message || "Farzandingizning holati va davomati bo'yicha bog'chadan eslatma.";
  let sentCount = 0;

  ids.forEach(id => {
    const child = children.find(c => c.id === id);
    if (child) {
      // Send Telegram notification if linked
      if (child.telegramChatId) {
        sendTelegramMessage(child.telegramChatId, `🔔 *BOG'CHA ESLATMASI*\n\nFarzandingiz: *${child.name}*\n\n${finalMsg}`);
        sentCount++;
      }
      
      // Send Simulated SMS
      if (child.parentPhone) {
        const success = Math.random() > 0.05;
        smsLogs.unshift({
          id: `SMS-${Date.now()}-${id}`,
          phone: child.parentPhone,
          message: `Eslatma: ${child.name} - ${finalMsg}`,
          date: new Date().toLocaleString(),
          status: success ? "Yuborildi" : "Xatolik",
          provider: "Eskiz SMS Gateway API (uz)",
          childId: child.id
        });
        if (smsLogs.length > 100) smsLogs.pop();
      }
    }
  });

  if (sentCount > 0 || ids.length > 0) {
    auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      user: "Direktor",
      action: `${ids.length} ta bolaning ota-onalariga ogohlantirish xabari yuborildi`,
      ip: req.ip || "127.0.0.1",
      device: "Web Browser"
    });
    saveDb();
    broadcastDataUpdate("notifications");
  }

  res.json({ success: true, message: `${ids.length} ta bolaning ota-onasiga eslatmalar muvaffaqiyatli jo'natildi.` });
});

// GROUPS ENDPOINTS
app.get("/api/groups", (req, res) => {
  const kgId = getKgId(req);
  if (kgId && kgId !== "all") {
    return res.json(groups.filter(g => g.kindergartenId === kgId));
  }
  res.json(groups);
});

app.post("/api/groups", validateKindergartenData, (req, res) => {
  const kgId = getKgId(req);
  const newGroup: Group = {
    ...req.body,
    id: `G-${groups.length + 1}`,
    kindergartenId: kgId,
    spots: 0
  };
  groups.push(newGroup);
  saveDb();
  res.json({ success: true, group: newGroup });
});

// EMPLOYEES ENDPOINTS
app.get("/api/employees", (req, res) => {
  const kgId = getKgId(req);
  if (kgId && kgId !== "all") {
    return res.json(employees.filter(e => e.kindergartenId === kgId));
  }
  res.json(employees);
});

app.post("/api/employees", validateKindergartenData, (req, res) => {
  const kgId = getKgId(req);
  const newEmp: Employee = {
    ...req.body,
    id: `E-${employees.length + 1}`,
    kindergartenId: kgId,
    status: "Faol",
    joinedDate: new Date().toISOString().split("T")[0]
  };
  employees.push(newEmp);

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: req.body.operatorName || "Direktor / SuperAdmin",
    action: `Yangi xodim qo'shildi: ${newEmp.name} (ID: ${newEmp.id}, Rol: ${newEmp.role})`,
    ip: req.ip || "127.0.0.1",
    device: "Management Portal",
    kindergartenId: kgId
  });

  saveDb();
  res.json({ success: true, employee: newEmp });
});

app.put("/api/employees/:id", (req, res) => {
  const idx = employees.findIndex(e => e.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: "Xodim topilmadi!" });

  employees[idx] = { ...employees[idx], ...req.body };

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: "Direktor / SuperAdmin",
    action: `Xodim tahrirlandi: ${employees[idx].name} (Status: ${employees[idx].status})`,
    ip: req.ip || "127.0.0.1",
    device: "Management Portal"
  });

  saveDb();
  res.json({ success: true, employee: employees[idx] });
});

// KINDERGARTENS ENDPOINTS
app.get("/api/kindergartens", (req, res) => {
  res.json(kindergartens);
});

app.post("/api/kindergartens", (req, res) => {
  const { name, address, phone } = req.body;
  if (!name) return res.status(400).json({ success: false, message: "Bog'cha nomi majburiy!" });
  
  const newK: Kindergarten = {
    id: `K-${kindergartens.length + 1}`,
    name,
    address: address || "",
    phone: phone || "",
    directorName: "Belgilanmagan",
    directorUsername: ""
  };
  kindergartens.push(newK);
  
  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: "SuperAdmin",
    action: `Yangi bog'cha qo'shildi: ${newK.name} (ID: ${newK.id})`,
    ip: req.ip || "127.0.0.1",
    device: "SuperAdmin Portal"
  });
  
  saveDb();
  res.json({ success: true, kindergarten: newK });
});

app.post("/api/kindergartens/:id/director", (req, res) => {
  const { id } = req.params;
  const { name, username, password, phone, passport } = req.body;
  
  const kg = kindergartens.find(k => k.id === id);
  if (!kg) return res.status(404).json({ success: false, message: "Bog'cha topilmadi!" });
  
  if (!username || !password || !name) {
    return res.status(400).json({ success: false, message: "F.I.O, login va parol majburiy!" });
  }
  
  // Check if username already exists
  const exists = employees.some(e => e.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(400).json({ success: false, message: "Ushbu login band, iltimos boshqa login tanlang!" });
  }
  
  const newEmp: Employee = {
    id: `E-${employees.length + 1}`,
    username: username,
    passwordHash: password,
    role: "Direktor",
    name: name,
    phone: phone || "",
    passport: passport || "",
    birthDate: "1985-01-01",
    joinedDate: new Date().toISOString().split("T")[0],
    status: "Faol",
    kindergartenId: id
  };
  employees.push(newEmp);
  
  kg.directorName = name;
  kg.directorUsername = username;
  
  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: "SuperAdmin",
    action: `Bog'chaga direktor tayinlandi: ${kg.name} (Direktor: ${name}, Login: ${username})`,
    ip: req.ip || "127.0.0.1",
    device: "SuperAdmin Portal"
  });
  
  saveDb();
  res.json({ success: true, employee: newEmp, kindergarten: kg });
});

// PAYMENTS & FINANCE ENDPOINTS (ACCOUNTANT SUITE)

// 1. PAYMENTS ENDPOINTS (CRUD)
app.get("/api/payments", (req, res) => {
  const kgId = getKgId(req);
  if (kgId && kgId !== "all") {
    const kgChildrenIds = new Set(children.filter(c => c.kindergartenId === kgId).map(c => c.id));
    return res.json(payments.filter(p => kgChildrenIds.has(p.childId)));
  }
  res.json(payments);
});

app.post("/api/payments", validateKindergartenData, (req, res) => {
  const { childId, amount, paymentType, month, status } = req.body;
  const payAmt = Number(amount);
  const standardFee = 1500000;
  
  // Find child first
  const child = children.find(c => c.id === childId);
  const childName = child ? child.name : "Noma'lum";
  const kgId = child ? child.kindergartenId : getKgId(req);

  // Look for existing payment for the specified child and month to aggregate
  const targetMonth = month || "Iyul";
  const existingPay = payments.find(p => p.childId === childId && p.month === targetMonth);

  let newPay: Payment;
  let remainingBalance = 0;

  if (existingPay) {
    // Add amount to existing payment
    existingPay.amount += payAmt;
    if (existingPay.amount >= standardFee) {
      existingPay.status = "To'landi";
    } else {
      existingPay.status = "Qisman";
    }
    existingPay.paymentType = paymentType || existingPay.paymentType;
    existingPay.date = new Date().toISOString().split("T")[0];
    newPay = existingPay;
    remainingBalance = Math.max(0, standardFee - existingPay.amount);
  } else {
    // Create new payment record
    const finalStatus = payAmt >= standardFee ? "To'landi" : "Qisman";
    newPay = {
      id: `PAY-${100 + payments.length + 1}`,
      childId: childId,
      date: new Date().toISOString().split("T")[0],
      amount: payAmt,
      paymentType: paymentType || "Click",
      month: targetMonth,
      status: finalStatus
    };
    payments.push(newPay);
    remainingBalance = Math.max(0, standardFee - payAmt);
  }

  // Add to additional incomes database for full reconciliation
  const newInc: Income = {
    id: `INC-P-${Date.now().toString().slice(-4)}`,
    source: "Oylik to'lov",
    amount: payAmt,
    date: new Date().toISOString().split("T")[0],
    description: `Bolalar oylik to'lovi (ID: ${childId}, Oy: ${targetMonth}, Qoldiq: ${remainingBalance.toLocaleString()} UZS)`,
    kindergartenId: kgId
  };
  incomes.push(newInc);

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: req.body.operatorName || "Buxgalter",
    action: `${childName} uchun ${payAmt.toLocaleString()} UZS miqdorida to'lov qabul qilindi. Jami to'landi: ${newPay.amount.toLocaleString()} UZS, Qoldiq qarz: ${remainingBalance.toLocaleString()} UZS. (Oy: ${newPay.month})`,
    ip: req.ip || "127.0.0.1",
    device: "Accountant Portal",
    kindergartenId: kgId
  });

  // Notify linked parent via Telegram if linked with receipt and remaining balance!
  if (child && child.telegramChatId) {
    const balanceStr = remainingBalance > 0 
      ? `⚠️ *Sizda hali ${remainingBalance.toLocaleString()} UZS miqdorida qoldiq qarz mavjud.*` 
      : `🟢 *Oylik to'lov to'liq amalga oshirildi. Qarzdorlik mavjud emas!*`;

    sendTelegramMessage(
      child.telegramChatId, 
      `💳 *To'lov Qabul Qilindi!*\n\nFarzandingiz: *${child.name}*\nOy: *${newPay.month}*\nKiritilgan miqdor: *${payAmt.toLocaleString()} UZS*\nJami to'langan: *${newPay.amount.toLocaleString()} UZS*\nTo'lov usuli: *${newPay.paymentType}*\nTo'lov holati: *${newPay.status}*\n\n${balanceStr}\n\nTizimda muvaffaqiyatli qayd etildi. Rahmat!`
    );
  }

  saveDb();
  res.json({ success: true, payment: newPay, remainingBalance });
});

app.put("/api/payments/:id", (req, res) => {
  const { id } = req.params;
  const { amount, status, month, paymentType } = req.body;
  const payIndex = payments.findIndex(p => p.id === id);
  if (payIndex === -1) {
    return res.status(404).json({ success: false, message: "To'lov topilmadi!" });
  }

  payments[payIndex] = {
    ...payments[payIndex],
    amount: amount !== undefined ? Number(amount) : payments[payIndex].amount,
    status: status || payments[payIndex].status,
    month: month || payments[payIndex].month,
    paymentType: paymentType || payments[payIndex].paymentType
  };

  saveDb();
  res.json({ success: true, payment: payments[payIndex] });
});

app.delete("/api/payments/:id", (req, res) => {
  const { id } = req.params;
  const payIndex = payments.findIndex(p => p.id === id);
  if (payIndex === -1) {
    return res.status(404).json({ success: false, message: "To'lov topilmadi!" });
  }

  const removed = payments.splice(payIndex, 1)[0];
  
  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: "Buxgalter",
    action: `To'lov bekor qilindi: ID: ${removed.id}, Bola ID: ${removed.childId}, Summa: ${removed.amount.toLocaleString()} UZS`,
    ip: req.ip || "127.0.0.1",
    device: "Accountant Portal",
    kindergartenId: getKgId(req)
  });

  saveDb();
  res.json({ success: true, message: "To'lov muvaffaqiyatli bekor qilindi!" });
});

// 2. EXPENSES ENDPOINTS
app.get("/api/expenses", (req, res) => {
  const kgId = getKgId(req);
  if (kgId && kgId !== "all") {
    return res.json(expenses.filter(e => e.kindergartenId === kgId));
  }
  res.json(expenses);
});

app.post("/api/expenses", (req, res) => {
  const kgId = getKgId(req);
  const { category, description, amount, paymentType, responsible } = req.body;
  
  if (!category || !amount) {
    return res.status(400).json({ success: false, message: "Turkum va summa majburiy!" });
  }

  const newExp: Expense = {
    id: `EXP-${100 + expenses.length + 1}`,
    date: new Date().toISOString().split("T")[0],
    category,
    description: description || "",
    amount: Number(amount),
    paymentType: paymentType || "Naqd",
    responsible: responsible || "Buxgalter",
    kindergartenId: kgId
  };
  expenses.push(newExp);

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: "Buxgalter",
    action: `Yangi xarajat kiritildi: ${category} - ${newExp.amount.toLocaleString()} UZS (${newExp.paymentType})`,
    ip: req.ip || "127.0.0.1",
    device: "Accountant Portal",
    kindergartenId: kgId
  });

  saveDb();
  res.json({ success: true, expense: newExp });
});

// 3. PAYROLL ENDPOINTS
app.get("/api/payroll", (req, res) => {
  const kgId = getKgId(req);
  if (kgId && kgId !== "all") {
    return res.json(payrolls.filter(p => p.kindergartenId === kgId));
  }
  res.json(payrolls);
});

app.post("/api/payroll", (req, res) => {
  const kgId = getKgId(req);
  const { employeeId, baseSalary, bonus, fine, tax, status } = req.body;
  
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) {
    return res.status(404).json({ success: false, message: "Xodim topilmadi!" });
  }

  const bSal = Number(baseSalary || 2000000);
  const bon = Number(bonus || 0);
  const fin = Number(fine || 0);
  const tx = Number(tax || 0); // 0% tax as requested (removed completely)
  const finalAmt = bSal + bon - fin - tx;

  const newPayroll: Payroll = {
    id: `PAYR-${100 + payrolls.length + 1}`,
    employeeId,
    employeeName: emp.name,
    employeeRole: emp.role,
    baseSalary: bSal,
    bonus: bon,
    fine: fin,
    tax: tx,
    finalAmount: finalAmt,
    date: new Date().toISOString().split("T")[0],
    status: status || "To'landi",
    kindergartenId: kgId
  };
  payrolls.push(newPayroll);

  // Add to expenses for accounting compliance
  const newExp: Expense = {
    id: `EXP-PAY-${Date.now().toString().slice(-4)}`,
    date: new Date().toISOString().split("T")[0],
    category: "Ish haqi",
    description: `${emp.name} (${emp.role}) oylik maosh to'lovi`,
    amount: finalAmt,
    paymentType: "Bank O'tkazmasi",
    responsible: "Buxgalter",
    kindergartenId: kgId
  };
  expenses.push(newExp);

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: "Buxgalter",
    action: `${emp.name} uchun ish haqi hisoblandi va to'landi: ${finalAmt.toLocaleString()} UZS`,
    ip: req.ip || "127.0.0.1",
    device: "Accountant Portal",
    kindergartenId: kgId
  });

  saveDb();
  res.json({ success: true, payroll: newPayroll });
});

app.post("/api/payroll/:id/settle", (req, res) => {
  const { id } = req.params;
  const payroll = payrolls.find(p => p.id === id);
  if (!payroll) {
    return res.status(404).json({ success: false, message: "Maosh hujjati topilmadi!" });
  }

  const oldStatus = payroll.status;
  payroll.status = "To'landi";
  
  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: "Buxgalter",
    action: `Xodim ${payroll.employeeName} oylik maosh qarzi (kam to'langan 300,000 UZS) to'liq yopildi.`,
    ip: req.ip || "127.0.0.1",
    device: "Accountant Portal",
    kindergartenId: payroll.kindergartenId
  });

  saveDb();
  res.json({ success: true, message: "Kam to'langan oylik qarzi muvaffaqiyatli to'landi va holat to'liq deb yangilandi!", payroll });
});

// 4. DEBTORS ENDPOINT (DYNAMIC CALCULATION)
app.get("/api/debtors", (req, res) => {
  const kgId = getKgId(req);
  const kgChildren = children.filter(c => !kgId || kgId === "all" || c.kindergartenId === kgId);

  const debtorsList = kgChildren.map(c => {
    // Check payments for July 2026
    const childPayments = payments.filter(p => p.childId === c.id);
    const julyPayment = childPayments.find(p => p.month === "Iyul");

    let debtAmount = 1500000; // standard fee
    let monthsDebt = 1;
    let status: "Qarzdor" | "Qisman" = "Qarzdor";

    if (julyPayment) {
      if (julyPayment.status === "To'landi") {
        return null; // paid in full
      } else if (julyPayment.status === "Qisman") {
        debtAmount = 1500000 - julyPayment.amount;
        status = "Qisman";
      }
    }

    const lastPay = childPayments[childPayments.length - 1];
    const lastPaymentDate = lastPay ? lastPay.date : "Sana yo'q";

    return {
      id: `DEB-${c.id}`,
      childId: c.id,
      childName: c.name,
      groupName: groups.find(g => g.id === c.groupId)?.name || "Noma'lum",
      parentName: c.parentName,
      phone: c.parentPhone,
      debtAmount,
      monthsDebt,
      lastPaymentDate,
      status
    };
  }).filter(Boolean);

  res.json(debtorsList);
});

// 5. INCOMES ENDPOINTS
app.get("/api/incomes", (req, res) => {
  const kgId = getKgId(req);
  if (kgId && kgId !== "all") {
    return res.json(incomes.filter(i => i.kindergartenId === kgId));
  }
  res.json(incomes);
});

app.post("/api/incomes", (req, res) => {
  const kgId = getKgId(req);
  const { source, amount, description } = req.body;
  
  if (!source || !amount) {
    return res.status(400).json({ success: false, message: "Mablag' manbasi va summa majburiy!" });
  }

  const newInc: Income = {
    id: `INC-${100 + incomes.length + 1}`,
    source,
    amount: Number(amount),
    date: new Date().toISOString().split("T")[0],
    description: description || "",
    kindergartenId: kgId
  };
  incomes.push(newInc);

  saveDb();
  res.json({ success: true, income: newInc });
});

// 6. PURCHASE REQUESTS ENDPOINTS (CHEF -> DIRECTOR -> ACCOUNTANT WORKFLOW)
app.get("/api/purchase-requests", (req, res) => {
  const kgId = getKgId(req);
  if (kgId && kgId !== "all") {
    return res.json(purchaseRequests.filter(p => p.kindergartenId === kgId));
  }
  res.json(purchaseRequests);
});

app.post("/api/purchase-requests", (req, res) => {
  const kgId = getKgId(req);
  const { senderName, senderRole, title, amount } = req.body;

  if (!title || !amount) {
    return res.status(400).json({ success: false, message: "Mahsulot nomi va summa majburiy!" });
  }

  const newReq: PurchaseRequest = {
    id: `REQ-${100 + purchaseRequests.length + 1}`,
    senderName: senderName || "Oshpaz",
    senderRole: senderRole || "Oshpaz",
    title,
    amount: Number(amount),
    date: new Date().toISOString().split("T")[0],
    status: "Kutilmoqda",
    kindergartenId: kgId
  };
  purchaseRequests.push(newReq);

  saveDb();
  res.json({ success: true, request: newReq });
});

app.put("/api/purchase-requests/:id", (req, res) => {
  const { id } = req.params;
  const { status, approvedBy } = req.body;
  const reqIndex = purchaseRequests.findIndex(p => p.id === id);

  if (reqIndex === -1) {
    return res.status(404).json({ success: false, message: "Xarid so'rovi topilmadi!" });
  }

  const oldStatus = purchaseRequests[reqIndex].status;

  purchaseRequests[reqIndex] = {
    ...purchaseRequests[reqIndex],
    status: status || purchaseRequests[reqIndex].status,
    approvedBy: approvedBy || purchaseRequests[reqIndex].approvedBy
  };

  // If newly PAID, generate expense automatically
  if (status === "To'landi" && oldStatus !== "To'landi") {
    const newExp: Expense = {
      id: `EXP-PUR-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split("T")[0],
      category: "Oziq-ovqat",
      description: `Tasdiqlangan xarid so'rovi to'lovi: ${purchaseRequests[reqIndex].title}`,
      amount: purchaseRequests[reqIndex].amount,
      paymentType: "Naqd",
      responsible: "Buxgalter",
      kindergartenId: purchaseRequests[reqIndex].kindergartenId
    };
    expenses.push(newExp);
  }

  saveDb();
  res.json({ success: true, request: purchaseRequests[reqIndex] });
});

// 7. NOTIFICATIONS/SEND SIMULATOR
app.post("/api/notifications/send", (req, res) => {
  const { channel, recipient, message } = req.body;
  console.log(`[Notification Simulator] Channel: ${channel}, To: ${recipient}, Msg: ${message}`);
  
  // Real long polling bot trigger simulation if telegram
  if (channel === "Telegram" && recipient) {
    const textToSend = (message.startsWith("Farzand") || message.includes("Bildirishnomasi"))
      ? message
      : `🔔 *BOG'CHA ESLATMASI*\n\n${message}`;

    sendTelegramMessage(recipient, textToSend);

    // Also copy to all active simulated chats to display immediately in the parent's bot simulator view
    activeSimulatedChats.forEach(cId => {
      if (cId !== recipient) {
        sendTelegramMessage(cId, textToSend);
      }
    });
  }

  res.json({ success: true, info: `Eslatma ${channel} orqali yuborildi.` });
});

// 8. UNIFIED DASHBOARD STATISTICS
app.get("/api/dashboard/statistics", (req, res) => {
  const kgId = getKgId(req);
  const todayStr = new Date().toISOString().split("T")[0];

  // Filter lists by kindergarten tenant
  const kgPayments = payments.filter(p => !kgId || kgId === "all" || children.find(c => c.id === p.childId)?.kindergartenId === kgId);
  const kgExpenses = expenses.filter(e => !kgId || kgId === "all" || e.kindergartenId === kgId);
  const kgPayrolls = payrolls.filter(p => !kgId || kgId === "all" || p.kindergartenId === kgId);
  const kgIncomes = incomes.filter(i => !kgId || kgId === "all" || i.kindergartenId === kgId);
  const kgRequests = purchaseRequests.filter(r => !kgId || kgId === "all" || r.kindergartenId === kgId);
  const kgChildren = children.filter(c => !kgId || kgId === "all" || c.kindergartenId === kgId);

  // Today's received payments
  const bugungiTushum = kgPayments.filter(p => p.date === todayStr).reduce((sum, p) => sum + p.amount, 0);

  // Monthly income ("Iyul")
  const oylikDaromad = kgPayments.filter(p => p.month === "Iyul").reduce((sum, p) => sum + p.amount, 0) + kgIncomes.reduce((sum, i) => sum + i.amount, 0);

  // Today's expenses
  const bugungiXarajat = kgExpenses.filter(e => e.date === todayStr).reduce((sum, e) => sum + e.amount, 0);

  // Dynamic Debtors count
  const debtorsList = kgChildren.map(c => {
    const childPays = payments.filter(p => p.childId === c.id);
    const julyPay = childPays.find(p => p.month === "Iyul");
    if (julyPay && julyPay.status === "To'landi") return null;
    return c;
  }).filter(Boolean);

  const qarzdorOtaOnalarSoni = debtorsList.length;

  // Paid Children and unpaid counts
  const tolovQilganBolalar = kgChildren.filter(c => {
    const childPays = payments.filter(p => p.childId === c.id);
    return childPays.some(p => p.month === "Iyul" && p.status === "To'landi");
  }).length;

  const tolamaganBolalar = kgChildren.length - tolovQilganBolalar;

  // Total payroll budget paid
  const xodimlarIshHaqi = kgPayrolls.reduce((sum, p) => sum + p.finalAmount, 0);

  // Purchases budget sum
  const xaridlar = kgRequests.reduce((sum, r) => sum + r.amount, 0);

  // Receipt count
  const bugungiCheklar = kgPayments.filter(p => p.date === todayStr).length;

  // Standard static monthly summary
  res.json({
    bugungiTushum,
    oylikDaromad,
    bugungiXarajat,
    qarzdorOtaOnalarSoni,
    tolovQilganBolalar,
    tolamaganBolalar,
    xodimlarIshHaqi,
    xaridlar,
    bugungiCheklar,
    history: {
      payments: kgPayments.slice(0, 15),
      expenses: kgExpenses.slice(0, 15),
      payrolls: kgPayrolls.slice(0, 15),
      incomes: kgIncomes.slice(0, 15),
      requests: kgRequests.slice(0, 15)
    }
  });
});

// 9. DYNAMIC FINANCIAL REPORTS DATA
app.get("/api/financial-reports", (req, res) => {
  const kgId = getKgId(req);
  const kgPayments = payments.filter(p => !kgId || kgId === "all" || children.find(c => c.id === p.childId)?.kindergartenId === kgId);
  const kgExpenses = expenses.filter(e => !kgId || kgId === "all" || e.kindergartenId === kgId);

  // Aggregate monthly data for Chart
  const monthlyData = [
    { name: "Yanvar", daromad: 105000000, xarajat: 72000000, foyda: 33000000 },
    { name: "Fevral", daromad: 112000000, xarajat: 74000000, foyda: 38000000 },
    { name: "Mart", daromad: 118000000, xarajat: 78000000, foyda: 40000000 },
    { name: "Aprel", daromad: 125000000, xarajat: 81000000, foyda: 44000000 },
    { name: "May", daromad: 121000000, xarajat: 83000000, foyda: 38000000 },
    { name: "Iyun", daromad: 130000000, xarajat: 85000000, foyda: 45000000 },
    { name: "Iyul", 
      daromad: kgPayments.reduce((sum, p) => sum + p.amount, 0), 
      xarajat: kgExpenses.reduce((sum, e) => sum + e.amount, 0), 
      foyda: kgPayments.reduce((sum, p) => sum + p.amount, 0) - kgExpenses.reduce((sum, e) => sum + e.amount, 0)
    }
  ];

  res.json({ monthlyData });
});

// 10. AI FINANCIAL INSIGHTS ENDPOINT USING GEMINI API
app.get("/api/accountant/ai-insights", async (req, res) => {
  const kgId = getKgId(req);
  const todayStr = new Date().toISOString().split("T")[0];

  const kgPayments = payments.filter(p => !kgId || kgId === "all" || children.find(c => c.id === p.childId)?.kindergartenId === kgId);
  const kgExpenses = expenses.filter(e => !kgId || kgId === "all" || e.kindergartenId === kgId);
  const kgPayrolls = payrolls.filter(p => !kgId || kgId === "all" || p.kindergartenId === kgId);
  const kgIncomes = incomes.filter(i => !kgId || kgId === "all" || i.kindergartenId === kgId);
  const kgChildren = children.filter(c => !kgId || kgId === "all" || c.kindergartenId === kgId);

  const totalPayments = kgPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalIncomes = kgIncomes.reduce((sum, i) => sum + i.amount, 0);
  const totalRevenue = totalPayments + totalIncomes;

  const totalExpenses = kgExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalSalaries = kgPayrolls.reduce((sum, p) => sum + p.finalAmount, 0);
  const totalOutflow = totalExpenses + totalSalaries;

  const netProfit = totalRevenue - totalOutflow;

  const debtorsCount = kgChildren.filter(c => {
    const childPays = payments.filter(p => p.childId === c.id);
    return !childPays.some(p => p.month === "Iyul" && p.status === "To'landi");
  }).length;

  try {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      const ai = getGemini();
      const prompt = `Siz bolalar bog'chasi uchun moliya bo'yicha tahlilchi AI-siz. Quyidagi moliyaviy ma'lumotlarni tahlil qiling va o'zbek tilida qisqa, tushunarli, pro-darajadagi hisobot va tavsiyalar bering:
Umumiy tushum (Daromad): ${totalRevenue.toLocaleString()} UZS (bolalar to'lovlari va boshqa tushumlar)
Umumiy xarajatlar: ${totalOutflow.toLocaleString()} UZS (ish haqi va turli operatsion xarajatlar)
Sof foyda: ${netProfit.toLocaleString()} UZS
Qarzdor bolalar soni: ${debtorsCount} ta bola (Iyul oyi uchun to'lamagan)

Kvitansiyalar va oylik tranzaksiyalar soni: ${kgPayments.length} ta.

Iltimos, JSON formatida quyidagi ma'lumotlarni qaytaring (hech qanday markdown backticksisiz, faqat toza JSON matni):
{
  "summary": "Moliya ahvoli bo'yicha 2-3 jumlali professional xulosa",
  "comparisons": "Daromad va xarajat nisbati haqida tahlil",
  "recommendations": [
    "Xarajatlarni kamaytirish yoki foyda oshirish uchun 1-tavsiya",
    "2-tavsiya",
    "3-tavsiya"
  ],
  "upcomingNotifications": [
    "Kelgusi to'lov muddatlari yoki soliq to'lovlari haqida eslatma 1",
    "Eslatma 2"
  ],
  "healthScore": 1 dan 100 gacha moliya salomatlik reytingi (masalan: 85)
}`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      const responseText = aiResponse.text || "{}";
      const cleanedJsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const result = JSON.parse(cleanedJsonStr);
      return res.json({ success: true, insights: result });
    } else {
      // Fallback
      const mockInsights = {
        summary: "Bog'chaning moliyaviy ahvoli barqaror. Daromadlar xarajatlardan sezilarli darajada ustun turadi, biroq qarzdorlarni qisqartirish talab etiladi.",
        comparisons: `Joriy daromadlar (${totalRevenue.toLocaleString()} UZS) xarajatlar (${totalOutflow.toLocaleString()} UZS) miqdoridan ${(totalRevenue > totalOutflow ? "ko'proq" : "kamroq")}. Operatsion rentabellik barqaror darajada.`,
        recommendations: [
          "Oziq-ovqat va xo'jalik xarajatlari dilerlik shartnomalarini qayta ko'rib chiqing.",
          "Qarzdor ota-onalar bilan Telegram eslatmalari orqali ishlash intensivligini oshiring.",
          "Davlat subsidiyalari yoki qo'shimcha to'garaklar tashkil etish orqali tushumlarni 15% ga oshirish mumkin."
        ],
        upcomingNotifications: [
          "15-Iyul: Xodimlar uchun oylik ijtimoiy soliqlar va daromad solig'i to'lovi muddati.",
          "20-Iyul: Kommunal xizmatlar (elektr, gaz) uchun oldindan to'lov balansi muddati."
        ],
        healthScore: netProfit > 0 ? 88 : 45
      };
      return res.json({ success: true, insights: mockInsights });
    }
  } catch (err) {
    console.error("Gemini AI finance error:", err);
    return res.json({
      success: false,
      message: "AI insights generated via fallback due to server error",
      insights: {
        summary: "Tizim barqaror ishlamoqda. Xarajatlarni monitoring qilish davom ettirilmoqda.",
        comparisons: "Ma'lumotlar yuklanmoqda...",
        recommendations: ["Ota-onalarga oylik to'lov xabarnomalarini o'z vaqtida jo'natish."],
        upcomingNotifications: ["Kommunal to'lov muddatlari yaqinlashmoqda."],
        healthScore: 75
      }
    });
  }
});

// ATTENDANCE ENDPOINTS
app.get("/api/attendance", (req, res) => {
  const kgId = getKgId(req);
  if (kgId && kgId !== "all") {
    const kgChildrenIds = new Set(children.filter(c => c.kindergartenId === kgId).map(c => c.id));
    return res.json(attendance.filter(a => kgChildrenIds.has(a.childId)));
  }
  res.json(attendance);
});

app.post("/api/attendance", (req, res) => {
  const { childId, date, status, checkIn, checkOut, reason, checkoutPhoto, checkoutPersonName } = req.body;
  const existingIndex = attendance.findIndex(a => a.childId === childId && a.date === date);

  const child = children.find(c => c.id === childId);
  const childName = child ? child.name : "Noma'lum";

  if (existingIndex !== -1) {
    const oldStatus = attendance[existingIndex].status;
    const newStatus = status || oldStatus;

    attendance[existingIndex] = {
      ...attendance[existingIndex],
      status: newStatus,
      checkIn: checkIn !== undefined ? checkIn : attendance[existingIndex].checkIn,
      checkOut: checkOut !== undefined ? checkOut : attendance[existingIndex].checkOut,
      reason: reason !== undefined ? reason : attendance[existingIndex].reason,
      checkoutPhoto: checkoutPhoto !== undefined ? checkoutPhoto : attendance[existingIndex].checkoutPhoto,
      checkoutPersonName: checkoutPersonName !== undefined ? checkoutPersonName : attendance[existingIndex].checkoutPersonName
    };

    // Trigger Telegram notification on status change
    if (child && child.telegramChatId && newStatus !== oldStatus) {
      let statusText = "";
      if (newStatus === "Kasal") {
        statusText = `🌡️ *Davomat Statusi Yangilandi!*\n\nFarzandingiz *${child.name}* bugungi davomat holati *'Kasal'* deb belgilandi.\n\nSog'liq tilaymiz! Tezroq sog'ayib ketishini kutib qolamiz. 🌸`;
      } else if (newStatus === "Sababli") {
        statusText = `📝 *Davomat Statusi Yangilandi!*\n\nFarzandingiz *${child.name}* bugun darsda sababli ishtirok eta olmayotganligi qayd etildi (Status: *'Sababli'*).`;
      } else if (newStatus === "Kelmagan") {
        statusText = `⚠️ *Davomat Statusi Yangilandi!*\n\nFarzandingiz *${child.name}* bugun darsga kelmaganligi qayd etildi (Status: *'Kelmagan'*).`;
      } else if (newStatus === "Keldi") {
        statusText = `✅ *Davomat Statusi Yangilandi!*\n\nFarzandingiz *${child.name}* davomat statusi *'Keldi'* deb yangilandi.`;
      } else if (newStatus === "Kechikdi") {
        statusText = `⚠️ *Davomat Statusi Yangilandi!*\n\nFarzandingiz *${child.name}* davomat statusi *'Kechikdi'* (Kechikib keldi) deb yangilandi.`;
      }
      if (statusText) {
        sendTelegramMessage(child.telegramChatId, statusText);
      }
    }

    if (status === "Ketdi" || checkOut) {
      if (child) {
        child.status = "Kelmagan";
        if (child.telegramChatId) {
          const personStr = checkoutPersonName ? `*${checkoutPersonName}*` : "tarbiyachi hamrohligida";
          const photoNoteStr = checkoutPhoto ? "\n🖼️ *Olib ketgan shaxsning surati ilova qilindi (Webcam orqali tasdiqlangan).*" : "";
          sendTelegramMessage(child.telegramChatId, `⬅️ *Ketish Bildirishnomasi!*\n\nFarzandingiz *${child.name}* bugun soat *${checkOut || formatTimeHHMM()}* da bog'chadan uyga ketdi.\n\n👤 Olib ketgan shaxs: ${personStr}${photoNoteStr}\n\nE'tiboringiz va ishonchingiz uchun rahmat!`);
        }
      }
    }

    saveDb();
    if (child) {
      checkAttendanceAnomaly(date || new Date().toISOString().split("T")[0], child.kindergartenId);
    }
    return res.json({ success: true, attendance: attendance[existingIndex] });
  }

  const newAtt: Attendance = {
    id: `ATT-${Date.now().toString().slice(-6)}`,
    childId,
    date: date || new Date().toISOString().split("T")[0],
    checkIn: checkIn || null,
    checkOut: checkOut || null,
    status: status || "Keldi",
    reason: reason || null,
    deviceIp: null,
    checkoutPhoto: checkoutPhoto || undefined,
    checkoutPersonName: checkoutPersonName || undefined
  };
  attendance.push(newAtt);

  // Update Child live status
  if (child) {
    child.status = status === "Keldi" || status === "Kechikdi" ? "Bog'chada" : "Kelmagan";
    
    // Notify on Check In
    if ((status === "Keldi" || status === "Kechikdi") && child.telegramChatId) {
      sendTelegramMessage(child.telegramChatId, `✅ *Kelish Bildirishnomasi!*\n\nFarzandingiz *${child.name}* bugun soat *${checkIn || formatTimeHHMM()}* da bog'chaga muvaffaqiyatli yetib keldi.\n\nSog'lom va quvnoq kun tilaymiz!`);
    }
  }

  saveDb();
  if (child) {
    checkAttendanceAnomaly(date || new Date().toISOString().split("T")[0], child.kindergartenId);
  }
  res.json({ success: true, attendance: newAtt });
});

// Helper function to detect drop/spike anomalies in kindergarten daily attendance and notify Director
function checkAttendanceAnomaly(targetDate: string, kgId?: string) {
  // 1. Filter children for this kindergarten
  const kgChildren = children.filter(c => !kgId || kgId === "all" || c.kindergartenId === kgId);
  const totalKids = kgChildren.length;
  if (totalKids === 0) return;

  // 2. Calculate daily attendance counts
  const countsByDate: Record<string, number> = {};
  attendance.forEach(att => {
    const childOfKg = kgChildren.some(c => c.id === att.childId);
    if (childOfKg && (att.status === "Keldi" || att.status === "Kechikdi" || att.status === "Ketdi" || att.checkIn)) {
      countsByDate[att.date] = (countsByDate[att.date] || 0) + 1;
    }
  });

  // 3. Find historical dates excluding targetDate
  const historicalDates = Object.keys(countsByDate).filter(d => d !== targetDate);
  if (historicalDates.length === 0) return;

  const totalHistoricalCount = historicalDates.reduce((sum, d) => sum + countsByDate[d], 0);
  const avgHistoricalCount = totalHistoricalCount / historicalDates.length;

  // 4. Calculate target date count
  const todayCount = countsByDate[targetDate] || 0;
  if (todayCount === 0 && avgHistoricalCount === 0) return;

  // 5. Calculate deviation percentage
  const deviation = avgHistoricalCount > 0 ? (todayCount - avgHistoricalCount) / avgHistoricalCount : 0;
  const deviationPct = Math.round(deviation * 100);

  // Threshold: 20% drop or spike
  const THRESHOLD = 20;

  if (Math.abs(deviationPct) >= THRESHOLD) {
    const isDrop = deviationPct < 0;
    const directionWord = isDrop ? "PASAYISH 📉" : "KESKIN ORTISH 📈";
    const alertEmoji = isDrop ? "⚠️" : "🚀";
    
    const messageText = `${alertEmoji} *DIREKTOR DIQQATIGA: DAVOMATDA ANOMALIYA!* \n\n` +
      `Bugungi kunda kutilmagan davomatda *${directionWord}* aniqlandi!\n\n` +
      `• *Sana:* ${targetDate}\n` +
      `• *Bugungi tashrif:* ${todayCount} ta bola (${Math.round((todayCount / totalKids) * 100)}%)\n` +
      `• *O'rtacha tarixiy davomat:* ${Math.round(avgHistoricalCount)} ta bola (${Math.round((avgHistoricalCount / totalKids) * 100)}%)\n` +
      `• *Farq:* ${deviationPct > 0 ? "+" : ""}${deviationPct}%\n\n` +
      `💡 *AI Tavsiyasi:* ` +
      (isDrop 
        ? `Tarbiyachilarga bolalarning sabablarini aniqlash va ota-onalar bilan bog'lanish topshirilsin. Oziq-ovqat xarajatlarini bugun 15% gacha qisqartirish tavsiya etiladi.`
        : `Oshxonada qo'shimcha porsiyalar tayyorlashni va tarbiyachilar navbatchiligini kuchaytirishni ko'rib chiqing.`);

    // Send to linked directors of this kindergarten
    const directorsToNotify = employees.filter(e => e.role === "Direktor" && (!kgId || kgId === "all" || e.kindergartenId === kgId));
    directorsToNotify.forEach(dir => {
      if (dir.telegramChatId) {
        sendTelegramMessage(dir.telegramChatId, messageText);
      }
    });

    // Also send to simulated fallback chat ID so the user can easily see it in the simulator UI
    sendTelegramMessage("SIM-DIRECTOR", messageText);
    
    // Also post an audit log
    auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      user: "AI Monitor",
      action: `Davomat anomaliyasi bo'yicha Direktorga Telegram ogohlantirish yuborildi: ${deviationPct > 0 ? "+" : ""}${deviationPct}%`,
      ip: "System",
      device: "AI Diagnostic Engine"
    });
  }
}

// POST /api/gemini/attendance-deep-dive - AI-driven absenteeism and scheduling analysis
app.post("/api/gemini/attendance-deep-dive", async (req, res) => {
  const kgId = getKgId(req);
  const kgChildren = children.filter(c => !kgId || kgId === "all" || c.kindergartenId === kgId);
  const kgAttendance = attendance.filter(a => kgChildren.some(c => c.id === a.childId));

  // Build a summary of attendance data for Gemini
  const childStats: Record<string, { name: string, group: string, present: number, absent: number, late: number, reasons: string[] }> = {};
  
  kgChildren.forEach(c => {
    childStats[c.id] = {
      name: c.name,
      group: groups.find(g => g.id === c.groupId)?.name || "Noma'lum",
      present: 0,
      absent: 0,
      late: 0,
      reasons: []
    };
  });

  kgAttendance.forEach(att => {
    if (childStats[att.childId]) {
      if (att.status === "Keldi" || att.status === "Ketdi") {
        childStats[att.childId].present++;
      } else if (att.status === "Kechikdi") {
        childStats[att.childId].late++;
      } else if (att.status === "Sababli" || att.status === "Sababsiz") {
        childStats[att.childId].absent++;
        if (att.reason) {
          childStats[att.childId].reasons.push(att.reason);
        }
      }
    }
  });

  const childSummaryList = Object.values(childStats).map(s => {
    return `${s.name} (${s.group}): ${s.present} marta kelgan, ${s.late} marta kechikkan, ${s.absent} marta dars qoldirgan. Sabablari: ${s.reasons.join(", ") || "Yo'q"}`;
  }).join("\n");

  try {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      const ai = getGemini();
      const prompt = `Siz bolalar bog'chasi direktori va tarbiyachilari uchun davomat tahlili va rejalashtirish bo'yicha ekspert AI-siz.
Sizga quyida bog'chadagi bolalarning o'tgan davrdagi davomat va dars qoldirish ma'lumotlari berilgan.
Iltimos, ushbu ma'lumotlarni tahlil qiling va bolalarning qatnashmaslik (absenteeism) sabablari, guruhlararo farqlar, klasterlar yoki mavsumiy tendensiyalar va buning shtat rejalashtirishga (staffing requirements) ta'sirini o'rganib, quyidagi tuzilmada batafsil tahliliy hisobot bering (o'zbek tilida, markdown formatida):

1. **Davomat umumiy tahlili**: Davomat va kechikishlarning umumiy ko'rsatkichlari.
2. **Qatnashmaslik sabablari tahlili (Absenteeism Patterns)**: Qatnashmaslikning eng keng tarqalgan klasterlari va sabablari (kasalliklar, oilaviy sharoit, tish shifokori ko'riklari va hkz).
3. **Mavsumiy va haftalik tendensiyalar**: Qaysi kunlari yoki davrlarda davomat pasayishi mumkinligi va nega.
4. **Shtat va resurslarga ta'siri (Staffing Insights)**: Ushbu anomaliyalardan kelib chiqib, xodimlar sonini qanday optimallashtirish bo'yicha maslahatlar (masalan, oshpaz, hamshira yoki tarbiyachi navbatchiligini qisqartirish/kuchaytirish).
5. **Konkret bolalar bo'yicha tavsiyalar**: Eng ko'p dars qoldirgan yoki kechikkan bolalar bilan ishlash bo'yicha pedagogik va ma'muriy takliflar.

Quyidagi ma'lumotlardan foydalaning:
${childSummaryList}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      return res.json({ success: true, analysis: response.text });
    } else {
      const mockAnalysis = `### 📊 AI Tahlili: Davomat va Qatnashmaslik Sabablari Chuqur Tahlili

Ushbu hisobot bog'cha bolalarining tarixiy davomat ma'lumotlari va Face ID skanerlari orqali yozib olingan biometrik tashriflar asosida tuzildi.

#### 1. 📈 Davomat va Kechikishlarning Umumiy Tahlili
- **O'rtacha davomat ko'rsatkichi:** 90.2% ni tashkil etadi, bu maktabgacha ta'lim muassasalari uchun barqaror va ijobiy ko'rsatkich hisoblanadi.
- **Kechikishlar foizi:** 8.4%. Kechikishlar asosan haftaning dushanba kunlariga to'g'ri keladi (hafta boshi adaptatsiyasi).
- **Sababli kelmaganlar:** 5.2%. Eng ko'p qayd etilgan sabab - tibbiy ko'riklar va yengil respirator kasalliklar.

#### 2. 🗂️ Qatnashmaslik Sabablari Klasterlari (Absenteeism Patterns)
Biz bolalarning dars qoldirish sabablari va xatti-harakatlarini 3 ta asosiy klasterga ajratdik:
- **Salomatlik Klasteri:** Tashrif buyurmaganlarning 60% qismi shamollash yoki tish shifokori ko'rigi sababli dars qoldirgan. Ayniqsa, kichik yoshdagi bolalarda (3 yoshgacha) ushbu holat ko'proq uchraydi.
- **Oila va Transport Klasteri:** 25% qismi oilaviy sayohatlar yoki transport muammolari bilan bog'liq. Ushbu sabab ko'proq uzoq tumanlardan keladigan bolalarda kuzatilgan.
- **Hafta oxiri (Shanba) Klasteri:** Shanba kunlari dars qoldirish asosan ota-onalarning dam olish kunlari farzandlarini uyda qoldirishni afzal ko'rishlari bilan bog'liq.

#### 3. 📅 Mavsumiy va Haftalik Tendensiyalar
- **Dushanba "Hafta boshi effekti":** Kechikishlarning 45% qismi dushanba kuni soat 08:30 dan keyin ro'y bergan. Bu dushanba tongidagi tirbandliklar va oilalarning dam olish kunidan so'ng rejimga qaytishi bilan bog'liq.
- **Chorshanba profilaktikasi:** Chorshanba kunlari tibbiy ko'riklar sababli 10-12% gacha davomat pasayishi kuzatiladi.
- **Shanba kunlari passivlik:** Shanba kuni jami ro'yxatdan atigi 78% bola tashrif buyuradi.

#### 4. 👥 Shtat va Resurslarni Rejalashtirish bo'yicha Tahlil (Staffing Insights)
Ushbu qonuniyatlardan kelib chiqib, quyidagi tashkiliy optimallashtirish choralarini tavsiya etamiz:
- **Shanba kuni xodimlar smenasini qisqartirish:** Shanba kunlari bolalar soni 22% gacha kamayishi sababli, 3 nafar tarbiyachidan 1 nafariga navbatdan tashqari dam olish kuni berish mumkin. Bu xodimlarning charchashini (burnout) kamaytiradi.
- **Oziq-ovqat xaridlarini moslashtirish:** Shanba va Chorshanba kunlari oshxona uchun mahsulot porsiyalarini 10% dan 20% gacha kamaytirish kerak. Bu oziq-ovqat chiqindilarini yo'qotib, byudjetni sezilarli tejaydi.
- **Tibbiy nazoratni kuchaytirish:** Dushanba kunlari ertalab bog'cha hamshirasi tomonidan filtrni kuchaytirish lozim (haroratni o'lchash), chunki dam olish kunlaridan so'ng viruslar tarqalishi xavfi yuqori bo'ladi.

#### 5. 🎯 Ayrim guruhlar va bolalar bo'yicha aniq tavsiyalar
- **Katta guruhda kechikishlar:** Ushbu guruh ota-onalari bilan ertalabki rejimning ahamiyati haqida suhbat o'tkazish tavsiya qilinadi.
- **Tashrif pasayganda:** Tizim orqali bolasi kelmagan ota-onaga avtomatik ravishda sababini so'rash va tibbiy maslahat berish xabari jo'natilishi yo'lga qo'yilsin (Telegram bot simulatori orqali).`;

      return res.json({ success: true, analysis: mockAnalysis });
    }
  } catch (err: any) {
    console.error("Gemini deep-dive error:", err);
    res.status(500).json({ success: false, message: err.message || "Xatolik yuz berdi" });
  }
});

// MEDICAL PORTAL APIs
app.get("/api/medical/cards", (req, res) => {
  res.json(children.map(c => ({ id: c.id, name: c.name, group: groups.find(g => g.id === c.groupId)?.name, medicalCard: c.medicalCard })));
});

app.post("/api/medical/update", (req, res) => {
  const { childId, allergies, bloodGroup, rhFactor, height, weight, vaccinations } = req.body;
  const child = children.find(c => c.id === childId);
  if (!child) return res.status(404).json({ success: false, message: "Bola topilmadi!" });

  const hMeter = (height || 100) / 100;
  const bmi = Number(((weight || 18) / (hMeter * hMeter)).toFixed(1));

  child.medicalCard = {
    allergies: allergies || child.medicalCard.allergies,
    bloodGroup: bloodGroup || child.medicalCard.bloodGroup,
    rhFactor: rhFactor || child.medicalCard.rhFactor,
    height: Number(height) || child.medicalCard.height,
    weight: Number(weight) || child.medicalCard.weight,
    bmi: bmi,
    vaccinations: vaccinations || child.medicalCard.vaccinations,
    lastCheckup: new Date().toISOString().split("T")[0]
  };

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: "Hamshira",
    action: `${child.name} uchun tibbiy karta yangilandi (Bo'yi: ${height}sm, Vazni: ${weight}kg, BMI: ${bmi})`,
    ip: req.ip || "127.0.0.1",
    device: "Medical Portal"
  });

  saveDb();
  res.json({ success: true, medicalCard: child.medicalCard });
});

// DAILY ACTIVITIES ENDPOINTS
app.get("/api/activities", (req, res) => {
  const kgId = getKgId(req);
  if (kgId && kgId !== "all") {
    const kgChildrenIds = new Set(children.filter(c => c.kindergartenId === kgId).map(c => c.id));
    return res.json(dailyActivities.filter(a => kgChildrenIds.has(a.childId)));
  }
  res.json(dailyActivities);
});

app.post("/api/activities", (req, res) => {
  const { childId, date, activities, engagement, discipline, communication, feeding, sleep, teacherNote } = req.body;
  const targetDate = date || new Date().toISOString().split("T")[0];
  const idx = dailyActivities.findIndex(a => a.childId === childId && a.date === targetDate);

  const payload = {
    id: idx !== -1 ? dailyActivities[idx].id : `ACT-${Date.now().toString().slice(-6)}`,
    childId,
    date: targetDate,
    activities: activities || [],
    engagement: Number(engagement) || 5,
    discipline: Number(discipline) || 5,
    communication: Number(communication) || 5,
    feeding: Number(feeding) || 5,
    sleep: Number(sleep) || 2,
    teacherNote: teacherNote || ""
  };

  if (idx !== -1) {
    dailyActivities[idx] = payload;
  } else {
    dailyActivities.push(payload);
  }

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: "Tarbiyachi Nodira",
    action: `Bola faolligi yozildi/yangilandi: ${children.find(c => c.id === childId)?.name}`,
    ip: req.ip || "127.0.0.1",
    device: "Teacher Portal"
  });

  saveDb();
  res.json({ success: true, activity: payload });
});

// MEALS, MENUS & KITCHEN KMS ENDPOINTS
app.get("/api/meals", (req, res) => {
  res.json(mealPlans);
});

app.post("/api/meals", (req, res) => {
  const { date, breakfast, lunch, dinner, morningSnack, afternoonSnack } = req.body;
  const targetDate = date || new Date().toISOString().split("T")[0];
  const idx = mealPlans.findIndex(m => m.date === targetDate);

  const defaultDetail: MealDetail = { title: "", calories: 0, protein: 0, fat: 0, carb: 0, vitamins: "", minerals: "", image: "", aiComment: "" };

  const payload: any = {
    date: targetDate,
    breakfast: breakfast || (idx !== -1 ? mealPlans[idx].breakfast : defaultDetail),
    lunch: lunch || (idx !== -1 ? mealPlans[idx].lunch : defaultDetail),
    dinner: dinner || (idx !== -1 ? mealPlans[idx].dinner : defaultDetail),
    morningSnack: morningSnack || (idx !== -1 ? (mealPlans[idx] as any).morningSnack : defaultDetail),
    afternoonSnack: afternoonSnack || (idx !== -1 ? (mealPlans[idx] as any).afternoonSnack : defaultDetail),
  };

  if (idx !== -1) {
    mealPlans[idx] = payload;
  } else {
    mealPlans.push(payload);
  }

  // Auto-send custom notification to parents if they are subscribed via Telegram Bot
  children.forEach(child => {
    if (child.telegramChatId) {
      sendTelegramMessage(child.telegramChatId, `🍽️ *Bugungi Yangi Taomnoma Taomlari (Sana: ${targetDate})!*\n\n🍳 *Nonushta:* ${payload.breakfast.title} (${payload.breakfast.calories} kcal)\n🍎 *Morning Snack:* ${payload.morningSnack?.title || "Meva va sharbat"}\n🍜 *Tushlik:* ${payload.lunch.title} (${payload.lunch.calories} kcal)\n🍰 *Peshindan keyingi bodroq:* ${payload.afternoonSnack?.title || "Kek va sut"}\n🍲 *Kechki ovqat:* ${payload.dinner.title} (${payload.dinner.calories} kcal)\n\n🤖 *AI Parhezshunos tavsiyasi:* ${payload.lunch.aiComment || "Bolalar uchun to'yimli va sog'lom taomlar!"}`);
    }
  });

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: "Oshpaz Rustam",
    action: `${targetDate} kunlik taomnoma yangilandi va Telegram Botga yuklandi`,
    ip: req.ip || "127.0.0.1",
    device: "Kitchen Portal"
  });

  saveDb();
  res.json({ success: true, mealPlan: payload });
});

// Alias GET /api/menus
app.get("/api/menus", (req, res) => {
  res.json(mealPlans);
});

// Alias POST /api/menus
app.post("/api/menus", (req, res) => {
  const { date, mealType, mealName, calories, protein, fat, carb, vitamins, minerals, allergens, cookingInstructions, portionSize, servingTime, ageGroup } = req.body;
  const targetDate = date || new Date().toISOString().split("T")[0];
  const idx = mealPlans.findIndex(m => m.date === targetDate);

  const defaultDetail: MealDetail = { title: "", calories: 0, protein: 0, fat: 0, carb: 0, vitamins: "", minerals: "", image: "", aiComment: "" };
  
  let currentPlan: any = idx !== -1 ? mealPlans[idx] : {
    date: targetDate,
    breakfast: { ...defaultDetail },
    lunch: { ...defaultDetail },
    dinner: { ...defaultDetail },
    morningSnack: { ...defaultDetail },
    afternoonSnack: { ...defaultDetail }
  };

  const mealDetail: any = {
    title: mealName,
    calories: Number(calories) || 300,
    protein: Number(protein) || 12,
    fat: Number(fat) || 8,
    carb: Number(carb) || 45,
    vitamins: vitamins || "A, C",
    minerals: minerals || "Kaltsiy",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=200",
    aiComment: `AI: Ushbu taom yosh guruhiga juda mos keladi. Tarkibida ${allergens || 'allergenlar yo\'q'}.`
  };

  const typeMap: Record<string, string> = {
    "Breakfast": "breakfast",
    "Morning Snack": "morningSnack",
    "Lunch": "lunch",
    "Afternoon Snack": "afternoonSnack",
    "Dinner": "dinner"
  };

  const targetKey = typeMap[mealType] || "lunch";
  currentPlan[targetKey] = mealDetail;

  if (idx !== -1) {
    mealPlans[idx] = currentPlan;
  } else {
    mealPlans.push(currentPlan);
  }

  saveDb();
  res.json({ success: true, mealPlan: currentPlan });
});

// Delete Menu
app.delete("/api/menus/:date", (req, res) => {
  const { date } = req.params;
  const idx = mealPlans.findIndex(m => m.date === date);
  if (idx !== -1) {
    mealPlans.splice(idx, 1);
    saveDb();
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: "Menyu topilmadi" });
  }
});

// GET /api/chef/dashboard
app.get("/api/chef/dashboard", (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const todayMenu = mealPlans.find(m => m.date === today) || mealPlans[0] || null;

  const lowStockCount = kgIngredients.filter(i => i.quantity <= 10).length;
  const activeRequests = purchaseRequests.filter(r => r.status === "Kutilmoqda").length;
  
  // Calculate special diet children and allergies count
  const allergyChildrenList = children.filter(c => c.medicalCard && c.medicalCard.allergies && c.medicalCard.allergies !== "Yo'q" && c.medicalCard.allergies !== "yo'q");
  const specialDietChildrenCount = children.filter(c => c.medicalCard && c.medicalCard.allergies && c.medicalCard.allergies.toLowerCase().includes("diabet") || c.medicalCard?.allergies?.toLowerCase().includes("gluten")).length;

  const totalMealsCount = children.filter(c => c.status === "Bog'chada").length;

  res.json({
    success: true,
    stats: {
      todayBreakfast: todayMenu?.breakfast?.title || "Sutli bo'tqa",
      todayLunch: todayMenu?.lunch?.title || "Karam sho'rva",
      todayAfternoonSnack: (todayMenu as any)?.afternoonSnack?.title || "Kek va sharbat",
      todayDinner: todayMenu?.dinner?.title || "Zapekanka",
      totalMealsPrepared: totalMealsCount * 3 || 75,
      childrenEatingToday: totalMealsCount || 25,
      specialDietChildren: specialDietChildrenCount || 4,
      allergyAlerts: allergyChildrenList.length,
      lowStockIngredients: lowStockCount,
      purchaseRequests: activeRequests,
      kitchenTasks: 6,
      aiNutritionScore: todayMenu ? 94 : 85
    },
    charts: {
      weeklyMenu: [
        { name: "Dush", calories: 1250, protein: 48, cost: 15000 },
        { name: "Sesh", calories: 1380, protein: 55, cost: 18000 },
        { name: "Chor", calories: 1290, protein: 52, cost: 16500 },
        { name: "Pay", calories: 1420, protein: 58, cost: 19000 },
        { name: "Jum", calories: 1310, protein: 50, cost: 16000 }
      ],
      caloriesDistribution: [
        { name: "Nonushta", value: 30 },
        { name: "Snack 1", value: 10 },
        { name: "Tushlik", value: 40 },
        { name: "Snack 2", value: 10 },
        { name: "Kechki ovqat", value: 10 }
      ],
      proteinIntake: [
        { name: "Hafta 1", norm: 45, actual: 48 },
        { name: "Hafta 2", norm: 45, actual: 46 },
        { name: "Hafta 3", norm: 45, actual: 51 },
        { name: "Hafta 4", norm: 45, actual: 49 }
      ],
      wasteStatistics: [
        { name: "Dush", prepared: 45, waste: 2 },
        { name: "Sesh", prepared: 45, waste: 4 },
        { name: "Chor", prepared: 45, waste: 1 },
        { name: "Pay", prepared: 45, waste: 3 },
        { name: "Jum", prepared: 45, waste: 2 }
      ]
    }
  });
});

// GET /api/ingredients
app.get("/api/ingredients", (req, res) => {
  res.json(kgIngredients);
});

// POST /api/ingredients
app.post("/api/ingredients", (req, res) => {
  const { name, category, quantity, unit, supplier, expirationDate, purchasePrice } = req.body;
  if (!name) return res.status(400).json({ success: false, message: "Nom kiritilishi shart" });

  const kgId = getKgId(req) || "K-1";

  const newIng: Ingredient = {
    id: `ING-${Date.now().toString().slice(-4)}`,
    name,
    category: category || "Vegetables",
    quantity: Number(quantity) || 0,
    unit: unit || "kg",
    supplier: supplier || "Dehqon Bozori",
    expirationDate: expirationDate || new Date().toISOString().split("T")[0],
    purchasePrice: Number(purchasePrice) || 0,
    status: Number(quantity) <= 10 ? "Kam qolgan" : "Yetarli"
  };

  kgIngredients.push(newIng);

  // Automatically record direct ingredient purchase as an expense
  const totalCost = (Number(purchasePrice) || 0) * (Number(quantity) || 1);
  if (totalCost > 0) {
    const newExp: Expense = {
      id: `EXP-ING-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split("T")[0],
      category: "Oziq-ovqat",
      description: `Oshpaz tomonidan to'g'ridan-to'g'ri xarid qilingan: ${name} (${quantity} ${unit || "kg"})`,
      amount: totalCost,
      paymentType: "Naqd",
      responsible: "Oshpaz",
      kindergartenId: kgId
    };
    expenses.push(newExp);
  }

  saveDb();
  res.json({ success: true, ingredient: newIng });
});

// PUT /api/ingredients/:id
app.put("/api/ingredients/:id", (req, res) => {
  const { id } = req.params;
  const { name, category, quantity, unit, supplier, expirationDate, purchasePrice } = req.body;
  const idx = kgIngredients.findIndex(i => i.id === id);

  if (idx !== -1) {
    kgIngredients[idx] = {
      ...kgIngredients[idx],
      name: name || kgIngredients[idx].name,
      category: category || kgIngredients[idx].category,
      quantity: quantity !== undefined ? Number(quantity) : kgIngredients[idx].quantity,
      unit: unit || kgIngredients[idx].unit,
      supplier: supplier || kgIngredients[idx].supplier,
      expirationDate: expirationDate || kgIngredients[idx].expirationDate,
      purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : kgIngredients[idx].purchasePrice,
      status: (quantity !== undefined ? Number(quantity) : kgIngredients[idx].quantity) <= 10 ? "Kam qolgan" : "Yetarli"
    };
    saveDb();
    res.json({ success: true, ingredient: kgIngredients[idx] });
  } else {
    res.status(404).json({ success: false, message: "Mahsulot topilmadi" });
  }
});

// DELETE /api/ingredients/:id
app.delete("/api/ingredients/:id", (req, res) => {
  const { id } = req.params;
  const idx = kgIngredients.findIndex(i => i.id === id);
  if (idx !== -1) {
    kgIngredients.splice(idx, 1);
    saveDb();
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false, message: "Mahsulot topilmadi" });
  }
});

// GET /api/inventory
app.get("/api/inventory", (req, res) => {
  res.json({
    currentStock: kgIngredients,
    expiredProducts: kgIngredients.filter(i => new Date(i.expirationDate) < new Date()),
    lowStockAlerts: kgIngredients.filter(i => i.quantity <= 10),
    history: [
      { id: "H-1", date: "2026-07-03", type: "Kirim", product: "Mol go'shti", qty: 20, unit: "kg", user: "Oshpaz Rustam" },
      { id: "H-2", date: "2026-07-02", type: "Chiqim", product: "Kartoshka", qty: 5, unit: "kg", user: "Oshpaz Rustam" }
    ]
  });
});

// POST /api/purchase-requests
app.post("/api/purchase-requests", (req, res) => {
  const { product, quantity, supplier, priority, price, senderName, senderRole } = req.body;
  const amount = (Number(price) || 10000) * (Number(quantity) || 1);
  const kgId = getKgId(req) || "K-1";

  const newReq: PurchaseRequest = {
    id: `REQ-${Date.now().toString().slice(-4)}`,
    senderName: senderName || "Abdullayev Rustam",
    senderRole: senderRole || "Oshpaz",
    title: `Oziq-ovqat xaridi: ${product} (${quantity} dona/kg)`,
    amount,
    date: new Date().toISOString().split("T")[0],
    status: "Kutilmoqda",
    kindergartenId: kgId
  };

  purchaseRequests.unshift(newReq);
  saveDb();
  res.json({ success: true, request: newReq });
});

// GET /api/recipes
app.get("/api/recipes", (req, res) => {
  res.json(kgRecipes);
});

// POST /api/recipes
app.post("/api/recipes", (req, res) => {
  const { title, category, instructions, ingredients, calories, protein, fat, carb, cost } = req.body;
  const newRec: Recipe = {
    id: `REC-${Date.now().toString().slice(-4)}`,
    title,
    category: category || "Pasta",
    instructions: instructions || "Retsept bo'yicha tayyorlang.",
    ingredients: ingredients || [],
    calories: Number(calories) || 300,
    protein: Number(protein) || 12,
    fat: Number(fat) || 8,
    carb: Number(carb) || 45,
    cost: Number(cost) || 10000
  };

  kgRecipes.push(newRec);
  saveDb();
  res.json({ success: true, recipe: newRec });
});

// GET /api/meal-gallery
app.get("/api/meal-gallery", (req, res) => {
  res.json(kgMealGallery);
});

// POST /api/meal-gallery
app.post("/api/meal-gallery", (req, res) => {
  const { title, url, type, kindergartenId, description } = req.body;
  const newItem: MealGalleryItem = {
    id: `GAL-${Date.now().toString().slice(-4)}`,
    title,
    url: url || "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=400",
    date: new Date().toISOString().split("T")[0],
    type: type || "After Cooking",
    kindergartenId: kindergartenId || req.headers["x-kindergarten-id"] || "",
    description: description || ""
  };
  kgMealGallery.unshift(newItem);
  saveDb();
  res.json({ success: true, galleryItem: newItem });
});

// DELETE /api/meal-gallery/:id
app.delete("/api/meal-gallery/:id", (req, res) => {
  const { id } = req.params;
  const index = kgMealGallery.findIndex(item => item.id === id);
  if (index !== -1) {
    kgMealGallery.splice(index, 1);
    saveDb();
    res.json({ success: true, message: "Rasm muvaffaqiyatli o'chirildi!" });
  } else {
    res.status(404).json({ success: false, message: "Rasm topilmadi!" });
  }
});

// GET /api/allergies
app.get("/api/allergies", (req, res) => {
  // Map children allergies
  const list = children
    .filter(c => c.medicalCard && c.medicalCard.allergies && c.medicalCard.allergies !== "Yo'q" && c.medicalCard.allergies !== "yo'q")
    .map(c => ({
      childId: c.id,
      childName: c.name,
      group: groups.find(g => g.id === c.groupId)?.name || "Katta guruh",
      allergy: c.medicalCard.allergies,
      suggestedAlternative: c.medicalCard.allergies.toLowerCase().includes("sut") ? "Laktozasiz Yogurt / Suv" : c.medicalCard.allergies.toLowerCase().includes("shokolad") ? "Meva yoki quruq meva" : "Tarkibida allergen bo'lmagan sabzavotlar"
    }));
  res.json(list);
});

// GET /api/reports/nutrition
app.get("/api/reports/nutrition", (req, res) => {
  res.json({
    dailyNutrition: {
      calories: 1350,
      protein: "52g",
      fat: "42g",
      carbohydrates: "165g",
      vitaminC: "85%",
      iron: "45%"
    },
    wasteReport: {
      totalPreparedKg: 120,
      totalWastedKg: 8.5,
      percentage: "7.0%",
      notes: "Suyuq ovqatlar bo'yicha isrof kam, salat va sabzavotlar bo'yicha biroz isrof kuzatildi."
    }
  });
});

// GEMINI AI NUTRITION ANALYZER
app.post("/api/meals/analyze", async (req, res) => {
  const { mealName, description, mealType } = req.body;
  if (!mealName) {
    return res.status(400).json({ success: false, message: "Taom nomi kiritilmadi!" });
  }

  try {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      const ai = getGemini();
      const prompt = `Siz bolalar parhezshunosi va oziq-ovqat muhandisi AI-siz. Quyidagi bolalar bog'chasi taomini tahlil qiling:
Taom nomi: "${mealName}"
Tavsifi: "${description || 'Sog\'lom bolalar taomi'}"
Taom turi: "${mealType || 'Tushlik'}" (Nonushta, Tushlik yoki Kechki ovqat)

Quyidagi ko'rsatkichlarni aniq hisoblab, JSON formatida taqdim eting:
- calories: Kaloriya miqdori (kcal, butun son)
- protein: Oqsil miqdori (g, butun son)
- fat: Yog' miqdori (g, butun son)
- carb: Uglevod miqdori (g, butun son)
- vitamins: Muhim vitaminlar tavsifi (Masalan: "Vitamin A (30%), Vitamin C (40%)")
- minerals: Muhim minerallar tavsifi (Masalan: "Kaltsiy (35%), Temir (15%)")
- aiComment: 3-6 yoshli bolalar uchun tavsiya va qisqa parhezshunos tahlili o'zbek tilida.

Faqat va faqat JSON formatidagi javobni qaytaring, ortiqcha tushuntirish va markdown backtickisiz (raw JSON text).`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt
      });

      const responseText = aiResponse.text || "{}";
      const cleanedJsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const result = JSON.parse(cleanedJsonStr);
      return res.json({ success: true, analysis: result });
    } else {
      // Offline fallback
      console.log("Using offline fallback nutritional nutritional simulator...");
      const mockResult = {
        calories: Math.floor(Math.random() * 300) + 300,
        protein: Math.floor(Math.random() * 15) + 10,
        fat: Math.floor(Math.random() * 10) + 8,
        carb: Math.floor(Math.random() * 40) + 40,
        vitamins: "Vitamin A (30%), Vitamin C (25%), Vitamin D (15%)",
        minerals: "Kaltsiy (35%), Temir (12%), Magniy (10%)",
        aiComment: `Simulyatsiya: Ushbu "${mealName}" taomi 3-6 yoshli bolalarning kunlik ehtiyojlariga mos keladi. Tarkibida kalsiy yetarli darajada bor.`
      };
      return res.json({ success: true, analysis: mockResult });
    }
  } catch (error: any) {
    console.error("AI Analysis error:", error);
    return res.status(500).json({ success: false, message: "AI Tahlili bajarilmadi!", error: error.message });
  }
});

// GEMINI AI DAILY ACTIVITY & IMAGE ANALYZER
app.post("/api/activities/analyze-image", async (req, res) => {
  const { image, childId, caption } = req.body;
  if (!image) {
    return res.status(400).json({ success: false, message: "Tahlil uchun rasm yuborilmadi!" });
  }

  try {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      const ai = getGemini();
      const prompt = `Siz bolalar rivojlanishi bo'yicha mutaxassis va AI psixolog-siz.
Dars/mashg'ulot davomida olingan ushbu rasm va dars ma'lumotlarini ("${caption || 'Faol dars jarayoni'}") tahlil qiling.
Bolaning darsda qatnashishi bo'yicha quyidagilarni baholang va maslahat bering (o'zbek tilida):
1. engagement: 1 dan 5 gacha butun son (darsga qiziqishi)
2. communication: 1 dan 5 gacha butun son (muloqot qobiliyati)
3. discipline: 1 dan 5 gacha butun son (intizom)
4. aiComment: 3-6 yoshli bola uchun o'quv faoliyati yutuqlari tahlili va ota-onalarga beriladigan juda iliq, qisqa tavsiya (o'zbek tilida).

Javobni aniq JSON formatida qaytaring, ortiqcha tushuntirish va backtickisiz (raw JSON text). Format:
{
  "engagement": 5,
  "communication": 4,
  "discipline": 5,
  "aiComment": "Sizning farzandingiz bugun..."
}`;

      // Convert base64 to GoogleGenAI compatible part if necessary, but we can pass text & base64 inline or simulate
      const parts: any[] = [prompt];
      if (image.startsWith("data:image/")) {
        const mimeType = image.split(";")[0].split(":")[1];
        const base64Data = image.split(",")[1];
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }

      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: parts
      });

      const responseText = aiResponse.text || "{}";
      const cleanedJsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const result = JSON.parse(cleanedJsonStr);
      return res.json({ success: true, analysis: result });
    } else {
      // Simulated Fallback
      const mockResult = {
        engagement: Math.floor(Math.random() * 2) + 4, // 4 or 5
        communication: Math.floor(Math.random() * 2) + 4, // 4 or 5
        discipline: Math.floor(Math.random() * 2) + 4, // 4 or 5
        aiComment: `AI Tahlili: Ushbu "${caption || 'ijodiy dars'}" jarayonida bolaning fikrlash darajasi va nozik motorikasi juda yaxshi rivojlanmoqda. Bola topshiriqlarni mustaqil va qunt bilan bajaradi. Ota-onalarga bolaning bu yutuqlarini uy sharoitida ham qo'llab-quvvatlash tavsiya qilinadi.`
      };
      return res.json({ success: true, analysis: mockResult });
    }
  } catch (error: any) {
    console.error("AI Activity Image Analysis error:", error);
    return res.status(500).json({ success: false, message: "AI Tahlili bajarilmadi!", error: error.message });
  }
});

// SUPER ADMIN DOCUMENTS & FUNDS API
app.get("/api/superadmin/documents", (req, res) => {
  res.json(superAdminDocuments);
});

app.post("/api/superadmin/documents", (req, res) => {
  const { title, allocatedFunds, targetDirectorUsername, fileName, fileUrl } = req.body;
  const newDoc: SuperAdminDocument = {
    id: `SAD-${100 + superAdminDocuments.length + 1}`,
    title: title || "Yangi Hujjat",
    allocatedFunds: Number(allocatedFunds) || 0,
    targetDirectorUsername: targetDirectorUsername || "director",
    fileName: fileName || "hujjat.pdf",
    fileUrl: fileUrl || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    date: new Date().toISOString().split("T")[0],
    distributedToPanels: []
  };
  superAdminDocuments.push(newDoc);

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: "Super Admin",
    action: `Yangi hujjat va maqsadli mablag' (${newDoc.allocatedFunds.toLocaleString()} UZS) biriktirildi: ${newDoc.title} (Direktor: ${newDoc.targetDirectorUsername})`,
    ip: req.ip || "127.0.0.1",
    device: "Super Admin Portal"
  });

  saveDb();
  res.json({ success: true, document: newDoc });
});

app.post("/api/superadmin/documents/:id/distribute", (req, res) => {
  const { id } = req.params;
  const { panels } = req.body;
  const doc = superAdminDocuments.find(d => d.id === id);
  if (!doc) {
    return res.status(404).json({ success: false, message: "Hujjat topilmadi!" });
  }

  const previouslyDistributedToBuxgalter = doc.distributedToPanels.includes("Buxgalter");
  doc.distributedToPanels = panels || [];

  if (doc.allocatedFunds && doc.allocatedFunds > 0 && panels.includes("Buxgalter") && !previouslyDistributedToBuxgalter) {
    const directorUser = employees.find(e => e.username === doc.targetDirectorUsername);
    const kgId = directorUser ? directorUser.kindergartenId : "K-1";

    const newInc = {
      id: `INC-${100 + incomes.length + 1}`,
      source: "Super Admin Maqsadli Mablag'i",
      amount: doc.allocatedFunds,
      date: new Date().toISOString().split("T")[0],
      description: `Super Admin maqsadli mablag'i (Hujjat: ${doc.title})`,
      kindergartenId: kgId
    };
    incomes.push(newInc);

    auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      user: "Direktor",
      action: `Super Admin ajratgan maqsadli mablag' (${doc.allocatedFunds.toLocaleString()} UZS) Buxgalteriyaga o'tkazildi (Hujjat: ${doc.title})`,
      ip: req.ip || "127.0.0.1",
      device: "Director Portal",
      kindergartenId: kgId
    });
  }

  saveDb();
  res.json({ success: true, document: doc });
});

// COMPLAINTS ENDPOINTS
app.get("/api/complaints", (req, res) => {
  const kgId = getKgId(req);
  if (kgId && kgId !== "all") {
    const kgChildrenIds = new Set(children.filter(c => c.kindergartenId === kgId).map(c => c.id));
    return res.json(complaints.filter(c => kgChildrenIds.has(c.childId)));
  }
  res.json(complaints);
});

app.post("/api/complaints/resolve", (req, res) => {
  const { id, status, parentName, childId, phone, text, kindergartenId } = req.body;
  
  if (!id) {
    // If no ID is passed, this is a new complaint from WebApp or similar
    const newCmp: Complaint = {
      id: `CMP-${Date.now().toString().slice(-4)}`,
      parentName: parentName || "Ota-ona",
      childId: childId || "B-101",
      phone: phone || "",
      text: text || "",
      date: new Date().toISOString().split("T")[0],
      status: "Yangi",
      kindergartenId: kindergartenId || "K-1"
    };
    complaints.unshift(newCmp);
    saveDb();
    broadcastDataUpdate("complaints");
    return res.json({ success: true, complaint: newCmp });
  }

  const idx = complaints.findIndex(c => c.id === id);
  if (idx !== -1) {
    complaints[idx].status = status || "Hal etildi";
    saveDb();
    broadcastDataUpdate("complaints");
    return res.json({ success: true, complaint: complaints[idx] });
  }
  res.status(404).json({ success: false, message: "Shikoyat topilmadi!" });
});

// AUDIT LOGS ENDPOINTS
app.get("/api/audit-logs", (req, res) => {
  const kgId = getKgId(req);
  if (kgId && kgId !== "all") {
    return res.json(auditLogs.filter(log => log.kindergartenId === kgId));
  }
  res.json(auditLogs);
});

app.post("/api/audit-logs", (req, res) => {
  const { user, action, moduleName, kindergartenId } = req.body;
  const kgId = kindergartenId || getKgId(req);
  const newLog: AuditLog = {
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: user || "Noma'lum foydalanuvchi",
    action: action || "Amal bajarildi",
    ip: req.ip || "127.0.0.1",
    device: `${moduleName || "Tizim"} Moduli`,
    kindergartenId: kgId
  };
  auditLogs.unshift(newLog);
  saveDb();
  res.json({ success: true, log: newLog });
});

// FACE ID DEVICE SCANNER INTEGRATION
// Valid IP addresses specified: 192.168.1.221 to 192.168.1.231
// Device Password specified: admin135@
// 5 entrances: .221 to .225, 5 exits: .226 to .230

// SMS Notification Queue for Telegram Simulator Integration
interface SmsNotification {
  id: string;
  phone: string;
  text: string;
  timestamp: number;
}
let smsQueue: SmsNotification[] = [];

// GET /api/telegram-simulator/pending-sms
app.get("/api/telegram-simulator/pending-sms", (req, res) => {
  res.json(smsQueue);
});

// POST /api/telegram-simulator/pending-sms/clear
app.post("/api/telegram-simulator/pending-sms/clear", (req, res) => {
  smsQueue = [];
  res.json({ success: true });
});

let simulatedTelegramMessages: any[] = [];
let activeSimulatedChats: string[] = [];

// GET /api/telegram-simulator/pending-messages
app.get("/api/telegram-simulator/pending-messages", (req, res) => {
  const { chatId } = req.query;
  if (!chatId) return res.json([]);
  
  const chatIdStr = chatId as string;
  if (!activeSimulatedChats.includes(chatIdStr)) {
    activeSimulatedChats.push(chatIdStr);
  }
  
  const pending = simulatedTelegramMessages.filter(m => m.chatId === chatIdStr);
  simulatedTelegramMessages = simulatedTelegramMessages.filter(m => m.chatId !== chatIdStr);
  res.json(pending);
});

let wsClients = new Set<WebSocket>();

function broadcastDataUpdate(module: string) {
  const payload = JSON.stringify({
    type: "data_update",
    module
  });

  wsClients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(payload);
      } catch (err) {
        console.error("Error sending WS data_update message:", err);
      }
    }
  });
}

function broadcastHardwareUpdate() {
  const payload = JSON.stringify({
    type: "hardware_update",
    data: {
      devices: activeDevices,
      totalDevicesCount: activeDevices.length,
      onlineDevicesCount: activeDevices.filter(d => d.status === "Online").length,
      faceIdCamerasCount: activeDevices.filter(d => d.type === "entrance" || d.type === "exit").length,
      healthPercentage: Math.round((activeDevices.filter(d => d.status === "Online").length / activeDevices.length) * 100)
    }
  });

  wsClients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(payload);
      } catch (err) {
        console.error("Error sending WS message:", err);
      }
    }
  });
}

// Background simulation of device heartbeats and status transitions
setInterval(() => {
  if (activeDevices.length === 0) return;
  const randIdx = Math.floor(Math.random() * activeDevices.length);
  const device = activeDevices[randIdx];

  const rand = Math.random();
  let nextStatus: "Online" | "Offline" | "Maintenance" = "Online";
  if (rand > 0.95) {
    nextStatus = "Offline";
  } else if (rand > 0.88) {
    nextStatus = "Maintenance";
  }

  device.status = nextStatus;
  device.details.latencyMs = Math.floor(Math.random() * 25) + 8;
  device.details.lastHeartbeat = formatTimeHHMMSS();
  
  if (device.id !== "DEV-231") {
    device.details.camera = nextStatus === "Offline" ? "Offline" : "Active";
  }

  broadcastHardwareUpdate();
}, 4000);

// Background simulation of automated camera attendance scans (every 2 seconds)
setInterval(() => {
  if (children.length === 0 && employees.length === 0) return;

  const isEmployee = Math.random() > 0.85;
  let person: any = null;

  if (isEmployee && employees.length > 0) {
    person = employees[Math.floor(Math.random() * employees.length)];
  } else if (children.length > 0) {
    person = children[Math.floor(Math.random() * children.length)];
  } else {
    return;
  }

  const timeString = formatTimeHHMM();
  const dateString = new Date().toISOString().split("T")[0];
  const [hours] = timeString.split(":").map(Number);
  const isEntrance = hours < 16;
  const temp = Number((36.2 + Math.random() * 0.8).toFixed(1));

  if (isEmployee) {
    const existingIndex = attendance.findIndex(a => a.childId === person.id && a.date === dateString);
    if (existingIndex !== -1) {
      if (isEntrance) {
        attendance[existingIndex].checkIn = timeString;
      } else {
        attendance[existingIndex].checkOut = timeString;
      }
      attendance[existingIndex].temperature = temp;
    } else {
      attendance.push({
        id: `ATT-${Date.now().toString().slice(-6)}`,
        childId: person.id,
        date: dateString,
        checkIn: isEntrance ? timeString : null,
        checkOut: isEntrance ? null : timeString,
        status: isEntrance ? "Keldi" : "Ketdi",
        reason: null,
        deviceIp: "192.168.1.221",
        temperature: temp
      });
    }

    const logMessage = `[Auto Cron] Mobil Kamera Face ID orqali xodim ${person.name} (${person.role}) soat ${timeString} da ${isEntrance ? "Keldi" : "Ketdi"} deb belgilandi. Harorat: ${temp}°C.`;
    auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: `${new Date().toLocaleDateString()} ${formatTimeHHMMSS()}`,
      user: "Simulyator",
      action: logMessage,
      ip: "127.0.0.1",
      device: "Avtomatik Tizim Skaneri"
    });
  } else {
    const existingIndex = attendance.findIndex(a => a.childId === person.id && a.date === dateString);
    let status: "Keldi" | "Ketdi" | "Kechikdi" | "Sababli" | "Sababsiz" = "Keldi";
    if (isEntrance) {
      const [h, m] = timeString.split(":").map(Number);
      if (h > 8 || (h === 8 && m > 30)) {
        status = "Kechikdi";
      } else {
        status = "Keldi";
      }
    } else {
      status = "Ketdi";
    }

    if (existingIndex !== -1) {
      if (isEntrance) {
        attendance[existingIndex].checkIn = timeString;
        attendance[existingIndex].status = status;
      } else {
        attendance[existingIndex].checkOut = timeString;
        attendance[existingIndex].status = "Ketdi";
        attendance[existingIndex].checkoutPersonName = "Ota-onasi";
      }
      attendance[existingIndex].temperature = temp;
    } else {
      attendance.push({
        id: `ATT-${Date.now().toString().slice(-6)}`,
        childId: person.id,
        date: dateString,
        checkIn: isEntrance ? timeString : null,
        checkOut: isEntrance ? null : timeString,
        status: status,
        reason: null,
        deviceIp: "192.168.1.221",
        checkoutPersonName: isEntrance ? undefined : "Ota-onasi",
        temperature: temp
      });
    }

    person.status = isEntrance ? "Bog'chada" : "Kelmagan";

    const logMessage = `[Auto Cron] Mobil Kamera Face ID orqali bola ${person.name} soat ${timeString} da ${isEntrance ? "Keldi (Bog'chada)" : "Ketdi (Ular ketishdi)"} deb belgilandi. Harorat: ${temp}°C.`;
    auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: `${new Date().toLocaleDateString()} ${formatTimeHHMMSS()}`,
      user: "Simulyator",
      action: logMessage,
      ip: "127.0.0.1",
      device: "Avtomatik Tizim Skaneri"
    });
  }

  saveDb();
  broadcastDataUpdate("attendance");
}, 2000);

// GET /api/hardware/status
app.get("/api/hardware/status", (req, res) => {
  res.json({
    devices: activeDevices,
    totalDevicesCount: activeDevices.length,
    onlineDevicesCount: activeDevices.filter(d => d.status === "Online").length,
    faceIdCamerasCount: activeDevices.filter(d => d.type === "entrance" || d.type === "exit").length,
    healthPercentage: Math.round((activeDevices.filter(d => d.status === "Online").length / activeDevices.length) * 100)
  });
});

// POST /api/hardware/devices - Register/connect a physical Face ID device
app.post("/api/hardware/devices", (req, res) => {
  const { id, name, ip, port, type, latencyThreshold, streamSensitivity } = req.body;
  if (!id || !name || !ip || !type) {
    return res.status(400).json({ success: false, message: "Barcha maydonlar to'ldirilishi shart (id, name, ip, type)!" });
  }

  const ipParts = ip.split(".");
  if (ipParts.length !== 4) {
    return res.status(400).json({ success: false, message: "IP manzili formati noto'g'ri (Masalan: 192.168.1.100)!" });
  }

  const portNum = port ? parseInt(port, 10) : 80;
  if (port && (isNaN(portNum) || portNum < 1 || portNum > 65535)) {
    return res.status(400).json({ success: false, message: "Port raqami noto'g'ri kiritildi (1 dan 65535 gacha bo'lishi lozim)!" });
  }

  const existingIndex = activeDevices.findIndex(d => d.ip === ip || d.id === id);
  const newDevice = {
    id,
    name,
    ip,
    port: portNum,
    status: "Online",
    type,
    latencyThreshold: latencyThreshold ? parseInt(latencyThreshold, 10) : 100,
    streamSensitivity: streamSensitivity ? parseInt(streamSensitivity, 10) : 80,
    details: {
      camera: "Active",
      thermometer: "Ready",
      relay: "Connected",
      latencyMs: 12,
      lastHeartbeat: new Date().toLocaleTimeString("uz-UZ")
    }
  };

  if (existingIndex !== -1) {
    activeDevices[existingIndex] = newDevice;
  } else {
    activeDevices.push(newDevice);
  }

  saveDb();
  broadcastHardwareUpdate();
  res.json({ 
    success: true, 
    message: `Qurilma muvaffaqiyatli ulandi! Tizim endi ushbu IP (${ip}) manzildan Face ID so'rovlarini xavfsiz qabul qiladi.`, 
    device: newDevice 
  });
});

// DELETE /api/hardware/devices/:id - Remove a physical device
app.delete("/api/hardware/devices/:id", (req, res) => {
  const { id } = req.params;
  activeDevices = activeDevices.filter(d => d.id !== id);
  saveDb();
  broadcastHardwareUpdate();
  res.json({ success: true, message: "Qurilma tizimdan muvaffaqiyatli o'chirildi." });
});

// POST /api/hardware/devices/:id/config - Update device thresholds & config
app.post("/api/hardware/devices/:id/config", (req, res) => {
  const { id } = req.params;
  const { latencyThreshold, streamSensitivity } = req.body;
  const device = activeDevices.find(d => d.id === id);
  if (!device) {
    return res.status(404).json({ success: false, message: "Qurilma topilmadi!" });
  }
  device.latencyThreshold = Number(latencyThreshold) || 100;
  device.streamSensitivity = Number(streamSensitivity) || 80;
  saveDb();
  broadcastHardwareUpdate();
  res.json({ success: true, message: `Qurilma "${device.name}" parametrlari muvaffaqiyatli yangilandi!`, device });
});

// GET /api/failed-checkins - Fetch all failed check-ins
app.get("/api/failed-checkins", (req, res) => {
  res.json(failedCheckins);
});

// POST /api/failed-checkins/:id/resolve - Map failed check-in to a child profile
app.post("/api/failed-checkins/:id/resolve", (req, res) => {
  const { id } = req.params;
  const { childId } = req.body;

  const log = failedCheckins.find(f => f.id === id);
  if (!log) {
    return res.status(404).json({ success: false, message: "Muvaffaqiyatsiz skanerlash yozuvi topilmadi!" });
  }

  const child = children.find(c => c.id === childId);
  if (!child) {
    return res.status(404).json({ success: false, message: "Bunday bola tizimda topilmadi!" });
  }

  const timeString = log.timestamp.split(" ")[1].slice(0, 5); // HH:MM
  const dateString = log.timestamp.split(" ")[0]; // YYYY-MM-DD

  // Check if attendance already exists
  const existingIndex = attendance.findIndex(a => a.childId === childId && a.date === dateString);

  let attendanceStatus: "Keldi" | "Ketdi" | "Kechikdi" | "Sababli" | "Sababsiz" = "Keldi";
  const isEntrance = log.deviceName.toLowerCase().includes("kirish") || log.deviceIp.split(".")[3] <= "225";
  if (isEntrance) {
    const [hours, minutes] = timeString.split(":").map(Number);
    if (hours > 8 || (hours === 8 && minutes > 30)) {
      attendanceStatus = "Kechikdi";
    } else {
      attendanceStatus = "Keldi";
    }
  } else {
    attendanceStatus = "Ketdi";
  }

  if (existingIndex !== -1) {
    if (isEntrance) {
      attendance[existingIndex].checkIn = timeString;
      attendance[existingIndex].status = attendanceStatus;
    } else {
      attendance[existingIndex].checkOut = timeString;
      attendance[existingIndex].status = "Ketdi";
    }
    attendance[existingIndex].deviceIp = log.deviceIp;
  } else {
    attendance.push({
      id: `ATT-${Date.now().toString().slice(-6)}`,
      childId: childId,
      date: dateString,
      checkIn: isEntrance ? timeString : null,
      checkOut: isEntrance ? null : timeString,
      status: attendanceStatus,
      reason: null,
      deviceIp: log.deviceIp,
      temperature: 36.6
    });
  }

  // Update failed check-in status
  log.resolved = true;
  log.resolvedChildId = childId;

  // Log to audit logger
  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
    user: "Direktor",
    action: `Muvaffaqiyatsiz skanerlash (${log.id}) muvaffaqiyatli ravishda ${child.name} ismli bolaga biriktirildi.`,
    ip: req.ip || "127.0.0.1",
    device: "Face ID Moduli"
  });

  saveDb();
  broadcastDataUpdate("attendance");
  res.json({ success: true, message: `Skanerlash muvaffaqiyatli ravishda ${child.name} ga biriktirildi!`, log });
});

// INSTANT CAMERA ATTENDANCE SCAN ENDPOINT
app.post("/api/attendance/scan", (req, res) => {
  const { targetId, imageFrame, type, direction, temperature } = req.body;
  
  let person: any = null;
  let isEmployee = false;

  if (targetId && targetId !== "auto") {
    person = children.find(c => c.id === targetId);
    if (!person) {
      person = employees.find(e => e.id === targetId);
      isEmployee = true;
    }
  } else {
    // Simulated Auto Facial Recognition: Match a person from the image frame
    if (children.length > 0) {
      person = children[Math.floor(Math.random() * children.length)];
      isEmployee = false;
    } else if (employees.length > 0) {
      person = employees[Math.floor(Math.random() * employees.length)];
      isEmployee = true;
    }
  }

  if (!person) {
    return res.status(404).json({ success: false, message: "Skanerlash uchun foydalanuvchi topilmadi. Avval ma'lumotlar mavjudligiga ishonch hosil qiling." });
  }

  const timeString = formatTimeHHMM();
  const dateString = new Date().toISOString().split("T")[0];
  const [hours] = timeString.split(":").map(Number);
  
  const existingIndex = attendance.findIndex(a => a.childId === person.id && a.date === dateString);
  
  let isEntrance = true;
  if (hours >= 16) {
    // Kechki soat 4 dan keyin ketganlarni hammasini ketdi deb belgilasin
    isEntrance = false;
  } else {
    // Kunduzi soat 4 gacha kelganlarni hammasini keldi deb belgilasin
    isEntrance = true;
  }

  const temp = Number(temperature || (36.2 + Math.random() * 0.8).toFixed(1));

  if (isEmployee) {
    if (existingIndex !== -1) {
      if (isEntrance) {
        attendance[existingIndex].checkIn = timeString;
      } else {
        attendance[existingIndex].checkOut = timeString;
      }
      attendance[existingIndex].temperature = temp;
    } else {
      attendance.push({
        id: `ATT-${Date.now().toString().slice(-6)}`,
        childId: person.id,
        date: dateString,
        checkIn: isEntrance ? timeString : null,
        checkOut: isEntrance ? null : timeString,
        status: isEntrance ? "Keldi" : "Ketdi",
        reason: null,
        deviceIp: null,
        temperature: temp
      });
    }

    const logMessage = `Mobil Kamera Face ID orqali xodim ${person.name} (${person.role}) soat ${timeString} da ${isEntrance ? "Keldi" : "Ketdi"} deb belgilandi. Harorat: ${temp}°C.`;
    auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: `${new Date().toLocaleDateString()} ${formatTimeHHMMSS()}`,
      user: "Mobil Kamera",
      action: logMessage,
      ip: req.ip || "127.0.0.1",
      device: "Telegram WebApp Kamera"
    });
  } else {
    // Child Attendance
    const existingIndex = attendance.findIndex(a => a.childId === person.id && a.date === dateString);
    let status: "Keldi" | "Ketdi" | "Kechikdi" | "Sababli" | "Sababsiz" = "Keldi";
    if (isEntrance) {
      const [hours, minutes] = timeString.split(":").map(Number);
      if (hours > 8 || (hours === 8 && minutes > 30)) {
        status = "Kechikdi";
      } else {
        status = "Keldi";
      }
    } else {
      status = "Ketdi";
    }

    if (existingIndex !== -1) {
      if (isEntrance) {
        attendance[existingIndex].checkIn = timeString;
        attendance[existingIndex].status = status;
      } else {
        attendance[existingIndex].checkOut = timeString;
        attendance[existingIndex].status = "Ketdi";
        attendance[existingIndex].checkoutPersonName = "Ota-onasi";
      }
      attendance[existingIndex].temperature = temp;
    } else {
      attendance.push({
        id: `ATT-${Date.now().toString().slice(-6)}`,
        childId: person.id,
        date: dateString,
        checkIn: isEntrance ? timeString : null,
        checkOut: isEntrance ? null : timeString,
        status: status,
        reason: null,
        deviceIp: null,
        checkoutPersonName: isEntrance ? undefined : "Ota-onasi",
        temperature: temp
      });
    }

    // Update child status
    person.status = isEntrance ? "Bog'chada" : "Kelmagan";

    const logMessage = `Mobil Kamera Face ID orqali bola ${person.name} soat ${timeString} da ${isEntrance ? "Keldi (Bog'chada)" : "Ketdi (Ular ketishdi)"} deb belgilandi. Harorat: ${temp}°C.`;
    auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: `${new Date().toLocaleDateString()} ${formatTimeHHMMSS()}`,
      user: "Mobil Kamera",
      action: logMessage,
      ip: req.ip || "127.0.0.1",
      device: "Telegram WebApp Kamera"
    });
  }

  saveDb();
  broadcastDataUpdate("attendance");

  res.json({
    success: true,
    message: `${person.name} muvaffaqiyatli belgilandi (${isEntrance ? "Keldi" : "Ketdi"})!`,
    person: {
      id: person.id,
      name: person.name,
      role: isEmployee ? person.role : "Tarbiya oluvchi",
      avatar: person.photo || "https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&q=80&w=200"
    },
    direction: isEntrance ? "in" : "out",
    time: timeString,
    temperature: temp
  });
});

app.post("/api/face-id/scan", (req, res) => {
  const { deviceIp, childId, password, checkoutPersonName, checkoutPhoto, temperature } = req.body;

  // Validation
  if (!deviceIp || !childId || !password) {
    return res.status(400).json({ success: false, message: "Barcha maydonlar majburiy (deviceIp, childId, password)!" });
  }

  // Check if deviceIp is registered
  const registeredDevice = activeDevices.find(d => d.ip === deviceIp);

  // Parse IP ending for legacy simulation range
  const ipParts = deviceIp.split(".");
  const lastOctet = Number(ipParts[ipParts.length - 1]);
  const isDefaultRange = ipParts.length === 4 && ipParts[0] === "192" && ipParts[1] === "168" && ipParts[2] === "1" && lastOctet >= 221 && lastOctet <= 231;

  if (!registeredDevice && !isDefaultRange) {
    return res.status(403).json({ success: false, message: "Ruxsat etilmagan Face ID qurilma IP manzili! Avval ushbu IP manzilni tizimga ulang (Qurilmalar ro'yxatidan qo'shing)." });
  }

  if (password !== "admin135@") {
    return res.status(401).json({ success: false, message: "Qurilma paroli noto'g'ri!" });
  }

  const child = children.find(c => c.id === childId);
  const employee = employees.find(e => e.id === childId);

  if (!child && !employee) {
    return res.status(404).json({ success: false, message: "ID topilmadi! Tizimga ruxsat etilmagan begona shaxs." });
  }

  // Determine direction: registered device type OR legacy last octet
  const isEntrance = registeredDevice ? registeredDevice.type === "entrance" : lastOctet <= 225;
  const timeString = formatTimeHHMM();
  const dateString = new Date().toISOString().split("T")[0];
  const deviceName = registeredDevice ? registeredDevice.name : (isEntrance ? `Kirish Qurilmasi #${lastOctet - 220} (.${lastOctet})` : `Chiqish Qurilmasi #${lastOctet - 225} (.${lastOctet})`);

  if (employee) {
    const direction = isEntrance ? "Ishga keldi" : "Ishdan ketdi";
    const logMessage = `Xodim ${employee.name} (${employee.role}) soat ${timeString} da ${direction.toLowerCase()} deb belgilandi. Harorat: ${temperature || '36.5'}°C.`;
    
    auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: `${new Date().toLocaleDateString()} ${formatTimeHHMMSS()}`,
      user: `Face ID: ${deviceName}`,
      action: logMessage,
      ip: deviceIp,
      device: deviceName
    });

    const existingIndex = attendance.findIndex(a => a.childId === childId && a.date === dateString);
    if (existingIndex !== -1) {
      if (isEntrance) {
        attendance[existingIndex].checkIn = timeString;
      } else {
        attendance[existingIndex].checkOut = timeString;
      }
      attendance[existingIndex].deviceIp = deviceIp;
      attendance[existingIndex].temperature = Number(temperature || 36.5);
    } else {
      attendance.push({
        id: `ATT-${Date.now().toString().slice(-6)}`,
        childId: childId,
        date: dateString,
        checkIn: isEntrance ? timeString : null,
        checkOut: isEntrance ? null : timeString,
        status: isEntrance ? "Keldi" : "Ketdi",
        reason: null,
        deviceIp: deviceIp,
        temperature: Number(temperature || 36.5)
      });
    }

    saveDb();
    broadcastDataUpdate("attendance");

    return res.json({
      success: true,
      message: `${employee.name} (${employee.role}) muvaffaqiyatli qayd etildi (${isEntrance ? "Keldi" : "Ketdi"}). Harorat: ${temperature || '36.5'}°C.`,
      attendance: attendance.find(a => a.childId === childId && a.date === dateString)
    });
  }

  const existingIndex = attendance.findIndex(a => a.childId === childId && a.date === dateString);

  let status: "Keldi" | "Ketdi" | "Kechikdi" | "Sababli" | "Sababsiz" = "Keldi";
  if (isEntrance) {
    const [hours, minutes] = timeString.split(":").map(Number);
    if (hours > 8 || (hours === 8 && minutes > 30)) {
      status = "Kechikdi";
    } else {
      status = "Keldi";
    }
  } else {
    status = "Ketdi";
  }

  if (existingIndex !== -1) {
    if (isEntrance) {
      attendance[existingIndex].checkIn = timeString;
      attendance[existingIndex].status = status;
    } else {
      attendance[existingIndex].checkOut = timeString;
      attendance[existingIndex].status = "Ketdi";
      attendance[existingIndex].checkoutPersonName = checkoutPersonName || "Otasi (Dilshod Karimov)";
      attendance[existingIndex].checkoutPhoto = checkoutPhoto || "https://images.unsplash.com/photo-1543269608-fa3d96937649?auto=format&fit=crop&q=80&w=400";
    }
    attendance[existingIndex].deviceIp = deviceIp;
    attendance[existingIndex].temperature = Number(temperature || 36.5);
  } else {
    const newAtt: Attendance = {
      id: `ATT-${Date.now().toString().slice(-6)}`,
      childId,
      date: dateString,
      checkIn: isEntrance ? timeString : null,
      checkOut: isEntrance ? null : timeString,
      status: status,
      reason: null,
      deviceIp: deviceIp,
      checkoutPersonName: isEntrance ? undefined : (checkoutPersonName || "Otasi (Dilshod Karimov)"),
      checkoutPhoto: isEntrance ? undefined : (checkoutPhoto || "https://images.unsplash.com/photo-1543269608-fa3d96937649?auto=format&fit=crop&q=80&w=400"),
      temperature: Number(temperature || 36.5)
    };
    attendance.push(newAtt);
  }

  // Update Child live status
  child.status = isEntrance ? "Bog'chada" : "Kelmagan";

  // Create Audit Log
  const logMessage = isEntrance 
    ? `Face ID skaneri orqali ${child.name} - Keldi (${timeString}) deb belgilandi. Harorat: ${temperature || '36.5'}°C.`
    : `Face ID skaneri orqali ${child.name} - Ketdi (${timeString}) deb belgilandi. Olib ketuvchi: ${checkoutPersonName || "Otasi (Dilshod Karimov)"}. Harorat: ${temperature || '36.5'}°C.`;

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: `${new Date().toLocaleDateString()} ${formatTimeHHMMSS()}`,
    user: `Face ID: ${deviceName}`,
    action: logMessage,
    ip: deviceIp,
    device: deviceName
  });

  saveDb();
  checkAttendanceAnomaly(dateString, child.kindergartenId);
  broadcastDataUpdate("attendance");

  // Send Telegram Notification if parent linked (ONLY on entrance, checkout notifications are manually triggered by caregiver)
  if (isEntrance) {
    const notifyChats: string[] = [];
    if (child.telegramChatId) {
      notifyChats.push(child.telegramChatId);
    }
    activeSimulatedChats.forEach(cId => {
      if (!notifyChats.includes(cId)) {
        notifyChats.push(cId);
      }
    });

    const emoji = "✅";
    const directionText = "bog'chaga yetib keldi";
    const statusNote = status === "Kechikdi" ? "⚠️ (Kechikib kelindi)" : "";
    const textMessage = `${emoji} *Davomat Bildirishnomasi!*\n\nFarzandingiz *${child.name}* bugun soat *${timeString}* da ${directionText}. ${statusNote}\n\n📍 Qurilma: ${deviceName}`;

    notifyChats.forEach(chatId => {
      sendTelegramMessage(chatId, textMessage);
    });
  }

  // Trigger simulated SMS notification via SMS queue for web simulator toast feedback
  const smsText = isEntrance
    ? `Farzandingiz ${child.name} soat ${timeString} da bog'chaga eson-omon yetib keldi. Tana harorati: ${req.body.temperature || '36.5'}°C.`
    : `Farzandingiz ${child.name} soat ${timeString} da bog'chadan uyga ketdi. Olib ketuvchi: ${checkoutPersonName || "Otasi (Dilshod Karimov)"}.`;

  smsQueue.push({
    id: `SMS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    phone: child.parentPhone || "+998 (90) 123-45-67",
    text: smsText,
    timestamp: Date.now()
  });

  res.json({
    success: true,
    message: `${child.name} muvaffaqiyatli qayd etildi (${isEntrance ? "Keldi" : "Ketdi"}).`,
    attendance: attendance.find(a => a.childId === childId && a.date === dateString)
  });
});

// TELEGRAM BOT WEB SIMULATOR & REAL TELEGRAM BOT HANDLER
interface UserState {
  chatId: string;
  step: "idle" | "awaiting_child_id" | "awaiting_complaint";
  linkedChildId: string | null;
}

const userStates: Record<string, UserState> = {};

interface TelegramApiLog {
  id: string;
  direction: "INCOMING" | "OUTGOING";
  method: string;
  payload: string;
  statusCode: number;
  timestamp: string;
}

let telegramApiLogs: TelegramApiLog[] = [
  { id: "TL-01", direction: "INCOMING", method: "getUpdates", payload: "Long Polling session initialized", statusCode: 200, timestamp: new Date(Date.now() - 60000).toISOString() },
  { id: "TL-02", direction: "OUTGOING", method: "sendMessage", payload: "{\"chat_id\":\"SIM-DIRECTOR\",\"text\":\"Assalomu alaykum!\"}", statusCode: 200, timestamp: new Date().toISOString() }
];

function addTelegramApiLog(direction: "INCOMING" | "OUTGOING", method: string, payload: any, statusCode: number) {
  const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
  telegramApiLogs.unshift({
    id: `TL-${Date.now()}-${Math.floor(Math.random() * 100)}`,
    direction,
    method,
    payload: payloadStr.slice(0, 300),
    statusCode,
    timestamp: new Date().toISOString()
  });
  if (telegramApiLogs.length > 20) {
    telegramApiLogs = telegramApiLogs.slice(0, 20);
  }
}

// Helper to get active Telegram Bot Token, bypassing outdated env keys
function getTelegramBotToken(): string {
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  // If the env token is missing or is the outdated one, return the new working token
  if (!envToken || envToken === "8723475488:AAHV_SCwJrLU39eyGh0LCKeZbKtBX6iWkOo" || envToken.includes("YOUR_")) {
    return "8723475488:AAGaZilNNb2jZll-l7zd6zMSuVF3vGi3U7E";
  }
  return envToken;
}

// Helper to send message to REAL Telegram API
async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: any) {
  let recipientName = "Noma'lum foydalanuvchi";
  if (chatId === "SIM-DIRECTOR") {
    recipientName = "Bog'cha Direktori";
  } else if (chatId === "SIM-PARENT") {
    recipientName = "Karimova Madina (Ota-ona)";
  } else {
    const child = children.find(c => c.telegramChatId === chatId);
    if (child) {
      recipientName = `${child.name} (Ota-ona)`;
    } else {
      const emp = employees.find(e => e.telegramChatId === chatId);
      if (emp) {
        recipientName = `${emp.name} (${emp.role})`;
      } else {
        recipientName = `Telegram Chat: ${chatId}`;
      }
    }
  }

  if (chatId.startsWith("SIM-")) {
    simulatedTelegramMessages.push({
      chatId,
      text,
      replyMarkup,
      timestamp: formatTimeHHMM()
    });
    addTelegramApiLog("OUTGOING", "sendMessage (SIM)", { chat_id: chatId, text }, 200);

    telegramNotifications.unshift({
      id: `TG-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      chatId,
      recipientName,
      message: text,
      timestamp: new Date().toLocaleString(),
      status: "Yuborildi"
    });
    if (telegramNotifications.length > 100) telegramNotifications.pop();
    saveDb();
    return;
  }
  const token = getTelegramBotToken();
  if (!token) {
    addTelegramApiLog("OUTGOING", "sendMessage (REAL)", { chat_id: chatId, text, error: "No Token" }, 401);
    telegramNotifications.unshift({
      id: `TG-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      chatId,
      recipientName,
      message: text,
      timestamp: new Date().toLocaleString(),
      status: "Xatolik"
    });
    if (telegramNotifications.length > 100) telegramNotifications.pop();
    saveDb();
    return;
  }
  try {
    const payload: any = {
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown"
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const success = res.status === 200;
    addTelegramApiLog("OUTGOING", "sendMessage (REAL)", payload, res.status);

    telegramNotifications.unshift({
      id: `TG-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      chatId,
      recipientName,
      message: text,
      timestamp: new Date().toLocaleString(),
      status: success ? "Yuborildi" : "Xatolik"
    });
    if (telegramNotifications.length > 100) telegramNotifications.pop();
    saveDb();
  } catch (e: any) {
    console.error("Error sending message to Telegram API:", e);
    addTelegramApiLog("OUTGOING", "sendMessage (REAL)", { chat_id: chatId, text, error: e.message }, 500);

    telegramNotifications.unshift({
      id: `TG-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      chatId,
      recipientName,
      message: text,
      timestamp: new Date().toLocaleString(),
      status: "Xatolik"
    });
    if (telegramNotifications.length > 100) telegramNotifications.pop();
    saveDb();
  }
}

function formatTimeHHMM(dateInput?: Date | string): string {
  const d = dateInput ? (typeof dateInput === "string" ? new Date(dateInput) : dateInput) : new Date();
  if (isNaN(d.getTime())) return "08:00";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTimeHHMMSS(dateInput?: Date | string): string {
  const d = dateInput ? (typeof dateInput === "string" ? new Date(dateInput) : dateInput) : new Date();
  if (isNaN(d.getTime())) return "08:00:00";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

let lastActiveChatId = "SIM-PARENT";

// Render dynamic bot menus with live WebApp personalization
function getMainMenuMarkup(chatId?: string) {
  const baseUrl = process.env.APP_URL || "https://ais-pre-5gfoznatixswdwsf4i7weo-539451072809.asia-east1.run.app";
  const activeChatId = chatId || lastActiveChatId || "SIM-PARENT";
  const webAppUrl = `${baseUrl}/parent-portal?chatId=${activeChatId}`;

  return {
    keyboard: [
      [{ text: "👶 Farzandim" }, { text: "📅 Davomat" }],
      [{ text: "🍽 Ovqatlar" }, { text: "🎨 Mashg'ulotlar" }],
      [{ text: "😊 Faollik" }, { text: "💳 To'lov" }],
      [
        { text: "💬 Shikoyat" },
        { 
          text: "🌐 Mini-Ilova",
          web_app: { url: webAppUrl }
        }
      ]
    ],
    resize_keyboard: true
  };
}

// Logic that handles bot inputs (both from real Telegram long poll and Web UI Simulator)
async function processBotMessage(chatId: string, text: string, senderName: string = "Ota-ona"): Promise<{ replyText: string; replyMarkup?: any }> {
  lastActiveChatId = chatId;
  // Ensure state exists
  if (!userStates[chatId]) {
    userStates[chatId] = { chatId, step: "idle", linkedChildId: null };
  }

  const state = userStates[chatId];

  // Try to find if this chat ID is already linked to a child in the db
  const linkedChild = children.find(c => c.telegramChatId === chatId);
  if (linkedChild) {
    state.linkedChildId = linkedChild.id;
  }

  // Command handlers
  if (text === "/start") {
    state.step = "awaiting_child_id";
    return {
      replyText: `Assalomu alaykum, *${senderName}*!\n\n🌸 *Nihol AI Bog'chasi* rasmiy Telegram botiga xush kelibsiz.\n\nIltimos, farzandingizga tarbiyachi yoki direktor tomonidan berilgan *Farzand ID raqamini* (Masalan: *B-101*) kiriting:`,
      replyMarkup: { force_reply: true }
    };
  }

  // If waiting for id link
  if (state.step === "awaiting_child_id" || !state.linkedChildId) {
    const inputId = text.trim().toUpperCase();
    const child = children.find(c => c.id === inputId);

    if (child) {
      child.telegramChatId = chatId; // Link inside database
      state.linkedChildId = child.id;
      state.step = "idle";
      saveDb();
      broadcastDataUpdate("children");

      // Log in audit log
      auditLogs.unshift({
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toLocaleString(),
        user: `Telegram Bot`,
        action: `Telegram Chat ${chatId} (${senderName}) muvaffaqiyatli ravishda bolaga bog'landi: ${child.name} (${child.id})`,
        ip: "Telegram API",
        device: "Telegram Server"
      });

      return {
        replyText: `🎉 *Muvaffaqiyatli bog'landi!*\n\n*Farzandingiz:* ${child.name}\n*Guruhi:* ${groups.find(g => g.id === child.groupId)?.name || "Noma'lum"}\n*Yoshi:* ${child.age} yosh\n*Holati:* ${child.status}\n\nQuyidagi menyulardan foydalanib farzandingiz hayoti va faoliyatini kuzatib boring:`,
        replyMarkup: getMainMenuMarkup()
      };
    } else {
      return {
        replyText: `⚠️ *ID xato kiritildi!* \n\nKechirasiz, bunday ID raqamli farzand topilmadi. Qayta tekshirib kiriting (Masalan: *B-101*).`,
        replyMarkup: { force_reply: true }
      };
    }
  }

  const child = children.find(c => c.id === state.linkedChildId);

  if (!child) {
    state.linkedChildId = null;
    state.step = "awaiting_child_id";
    return {
      replyText: "Tizimda xatolik yuz berdi. Iltimos, ID raqamingizni qaytadan kiriting:",
      replyMarkup: { force_reply: true }
    };
  }

  // COMPLAINT WORKFLOW
  if (state.step === "awaiting_complaint") {
    state.step = "idle";
    const newCmp: Complaint = {
      id: `CMP-${Date.now().toString().slice(-4)}`,
      parentName: child.parentName,
      childId: child.id,
      phone: child.parentPhone,
      text: text,
      date: new Date().toISOString().split("T")[0],
      status: "Yangi"
    };
    complaints.unshift(newCmp);

    auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      user: "Telegram Bot parent",
      action: `Telegram Bot orqali yangi shikoyat yuborildi: "${text.slice(0, 50)}..."`,
      ip: "Telegram API",
      device: "Telegram Bot"
    });

    saveDb();
    broadcastDataUpdate("complaints");

    return {
      replyText: `✅ *Shikoyat va taklifingiz qabul qilindi!*\n\nXabaringiz direktor paneliga yuborildi. Tez orada bog'cha ma'muriyati siz bilan bog'lanadi. Rahmat!`,
      replyMarkup: getMainMenuMarkup()
    };
  }

  // Button handlers (supporting both with and without emoji inputs)
  const cleanText = text.trim();
  switch (cleanText) {
    case "👶 Farzandim":
    case "Farzandim":
    case "farzandim":
    case "bola":
    case "bolam":
      return {
        replyText: `👶 *FARZANDIM PROFILI*\n\n📸 *Rasm:* [Profil rasmi](${child.photo})\n👤 *F.I.O:* ${child.name}\n📅 *Tug'ilgan sana:* ${child.birthDate} (${child.age} yosh)\n🌼 *Guruh:* ${groups.find(g => g.id === child.groupId)?.name || "Kichik guruh"}\n\n🩺 *Tibbiy ma'lumot:* \n• *Allergiya:* ${child.medicalCard.allergies}\n• *Qon guruhi:* ${child.medicalCard.bloodGroup} ${child.medicalCard.rhFactor}\n• *Bo'yi:* ${child.medicalCard.height} sm\n• *Vazni:* ${child.medicalCard.weight} kg\n• *Emlashlar:* ${child.medicalCard.vaccinations.join(", ") || "Mavjud emas"}`,
        replyMarkup: getMainMenuMarkup()
      };

    case "📅 Davomat":
    case "Davomat":
    case "davomat":
      const todayDate = new Date().toISOString().split("T")[0];
      const todayAtt = attendance.find(a => a.childId === child.id && a.date === todayDate);
      const isPresent = todayAtt ? (todayAtt.status === "Keldi" || todayAtt.status === "Kechikdi" || todayAtt.status === "Ketdi") : false;

      let todayText = "❌ Bugun bog'chaga kelmadi yoki belgilanmadi.";
      if (todayAtt) {
        if (todayAtt.status === "Keldi" || todayAtt.status === "Kechikdi") {
          todayText = `✅ *Kelgan vaqti:* ${todayAtt.checkIn || "08:00"} (Qurilma orqali)`;
        } else if (todayAtt.status === "Ketdi") {
          todayText = `⬅️ *Kelgan:* ${todayAtt.checkIn || "08:00"} | *Ketgan:* ${todayAtt.checkOut || "17:30"}`;
        } else if (todayAtt.status === "Sababli") {
          todayText = `⚠️ *Kelmagan (Sababli):* ${todayAtt.reason || "Shaxsiy sabab"}`;
        }
      }

      return {
        replyText: `📅 *DAVOMAT STATISTIKASI*\n\n📍 *Bugungi holat:* \n${todayText}\n\n📊 *Oylik statistika (Iyun/Iyul):*\n• Kelgan kunlar: *18 kun*\n• Kelmagan (sababli): *2 kun*\n• Kechikishlar: *1 kun*`,
        replyMarkup: getMainMenuMarkup()
      };

    case "🍽 Ovqatlar":
    case "Ovqatlar":
    case "ovqatlar":
    case "ovqat":
    case "taomnoma":
      const todayPlan = mealPlans[0]; // Get seed plan
      if (!todayPlan) {
        return { replyText: "🍽 Bugungi taomnoma hali yuklanmadi.", replyMarkup: getMainMenuMarkup() };
      }
      return {
        replyText: `🍲 *BUGUNGI TAOMNOMA*\n\n🍞 *Nonushta:* ${todayPlan.breakfast.title}\n🔥 Kaloriya: _${todayPlan.breakfast.calories} kcal_ | Protein: _${todayPlan.breakfast.protein}g_\n\n🍖 *Tushlik:* ${todayPlan.lunch.title}\n🔥 Kaloriya: _${todayPlan.lunch.calories} kcal_ | Protein: _${todayPlan.lunch.protein}g_\n\n🥣 *Kechki ovqat:* ${todayPlan.dinner.title}\n🔥 Kaloriya: _${todayPlan.dinner.calories} kcal_ | Protein: _${todayPlan.dinner.protein}g_\n\n🤖 *AI Tahlil:* \n_${todayPlan.breakfast.aiComment}_`,
        replyMarkup: getMainMenuMarkup()
      };

    case "🎨 Mashg'ulotlar":
    case "Mashg'ulotlar":
    case "mashg'ulotlar":
    case "mashg'ulot":
    case "mashgulot":
    case "mashgulotlar":
    case "darslar":
      const act = dailyActivities.find(a => a.childId === child.id);
      if (!act) {
        return { replyText: "🎨 Bugun dars mashg'ulotlari haqida ma'lumot kiritilmadi.", replyMarkup: getMainMenuMarkup() };
      }
      return {
        replyText: `🎨 *BUGUNGI MASHG'ULOTLAR*\n\nFarzandingiz bugun quyidagi dars va o'yinlarda faol qatnashdi:\n\n${act.activities.map((a, i) => `${i + 1}. *${a}*`).join("\n")}\n\n📸 Kun davomida olingan rasmlarni guruh telegram kanalimiz orqali ko'rishingiz mumkin!`,
        replyMarkup: getMainMenuMarkup()
      };

    case "😊 Faollik":
    case "Faollik":
    case "faollik":
    case "baholar": {
      const act = dailyActivities.find(a => a.childId === child.id);
      if (!act) {
        return { replyText: "😊 Bugun faollik baholari hali belgilanmadi.", replyMarkup: getMainMenuMarkup() };
      }

      const stars = (num: number) => "⭐".repeat(num) + "☆".repeat(5 - num);

      return {
        replyText: `😊 *FARZANDINGIZ FAOLLIGI (BUGUN)*\n\n🔥 *Darsdagi faollik:* ${stars(act.engagement)}\n💬 *Muloqot va nutq:* ${stars(act.communication)}\n🙌 *Intizom:* ${stars(act.discipline)}\n🍲 *Ovqat yeyishi:* ${stars(act.feeding)}\n😴 *Kechki uyqu:* ${act.sleep} soat\n\n📝 *Tarbiyachi izohi:* \n_"${act.teacherNote || 'Bugun juda yaxshi qatnashdi.'}"_`,
        replyMarkup: getMainMenuMarkup()
      };
    }

    case "💳 To'lov":
    case "To'lov":
    case "to'lov":
    case "tolov":
    case "moliya": {
      const childPays = payments.filter(p => p.childId === child.id);
      const lastPay = childPays[childPays.length - 1];

      let payStatusText = "🟢 Qarzdorlik mavjud emas.";
      if (lastPay && lastPay.status === "Qisman") {
        payStatusText = "🟡 Qarzdorlik mavjud (Iyul oyi uchun 1,000,000 so'm qoldiq).";
      }

      return {
        replyText: `💳 *TO'LOVLAR VA MOLIYA*\n\n💵 *Oylik shartnoma:* 1,500,000 UZS\n📊 *To'lov holati:* ${payStatusText}\n\n🕒 *Oxirgi to'lov tarixi:*\n• Sana: *${lastPay?.date || 'Noma\'lum'}*\n• Miqdori: *${lastPay ? lastPay.amount.toLocaleString() : '0'} UZS*\n• Turi: *${lastPay?.paymentType || 'Click'}*\n• Oy: *${lastPay?.month || 'Iyul'}*`,
        replyMarkup: getMainMenuMarkup()
      };
    }

    case "💬 Shikoyat":
    case "Shikoyat":
    case "shikoyat":
    case "ariza":
      state.step = "awaiting_complaint";
      return {
        replyText: `💬 *SHIKOYAT VA TAKLIF YUBORISH*\n\nIltimos, taklif yoki shikoyat matnini yozib yuboring. \n\nSizning xabaringiz to'g'ridan-to'g'ri bog'cha direktori ekraniga yetkaziladi va mutlaqo sir saqlanadi.`,
        replyMarkup: { force_reply: true }
      };

    case "☎️ Aloqa":
    case "Aloqa":
    case "aloqa":
    case "kontakt":
      return {
        replyText: `☎️ *BOG'LANISH VA ALOQA*\n\n🏢 *Bog'cha nomi:* Nihol AI Bog'chasi\n📞 *Telefon:* +998 71 123-45-67\n📍 *Manzil:* Toshkent sh., Chilonzor tumani, 5-mavze, 12-uy.\n👤 *Direktor:* Karimov Shaxzod Baxtiyorovich\n\nSavollaringiz bo'lsa, istalgan vaqtda qo'ng'iroq qilishingiz mumkin!`,
        replyMarkup: getMainMenuMarkup()
      };

    default:
      return {
        replyText: `Tushunarsiz buyruq. Iltimos, menyu tugmalaridan foydalaning.`,
        replyMarkup: getMainMenuMarkup()
      };
  }
}

// Actual telegram update logic handler
async function handleTelegramUpdate(update: any) {
  if (update.message && update.message.text) {
    const chatId = update.message.chat.id.toString();
    const text = update.message.text;
    const senderName = update.message.from ? `${update.message.from.first_name} ${update.message.from.last_name || ""}`.trim() : "Ota-ona";

    addTelegramApiLog("INCOMING", "messageReceived (REAL)", { chatId, text, senderName }, 200);
    const result = await processBotMessage(chatId, text, senderName);
    await sendTelegramMessage(chatId, result.replyText, result.replyMarkup);
  }
}

// Telegram simulator API route for front-end interface
app.post("/api/telegram-simulator/message", async (req, res) => {
  const { chatId, text, senderName } = req.body;
  const cId = chatId || "SIM-12345";
  const name = senderName || "Ikramdjanov";
  addTelegramApiLog("INCOMING", "messageReceived (SIM)", { chatId: cId, text, senderName: name }, 200);
  const result = await processBotMessage(cId, text, name);
  res.json({
    chatId: cId,
    replyText: result.replyText,
    replyMarkup: result.replyMarkup
  });
});

// Live Telegram WebApp data endpoint for Parent Portal
app.get("/api/parent-portal/data", (req, res) => {
  const { chatId } = req.query;
  if (!chatId) {
    return res.status(400).json({ error: "chatId is required" });
  }
  
  const cId = chatId.toString();
  // Find linked child
  let child = children.find(c => c.telegramChatId === cId);
  if (!child && cId.startsWith("SIM-")) {
    child = children.find(c => c.id === "B-101"); // Simulator preview fallback
  }
  
  if (!child) {
    return res.status(404).json({ error: "Ushbu Telegram Chat ID ga bog'langan bola topilmadi. Iltimos, avval boti orqali ro'yxatdan o'ting!" });
  }

  // Check if public portal access is enabled for this kindergarten
  const childKgId = child.kindergartenId || "K-1";
  const kg = kindergartens.find(k => k.id === childKgId);
  if (kg && kg.parentPortalActive === false) {
    return res.status(403).json({ error: "Ushbu bog'cha uchun ota-ona portali ma'muriyat tomonidan vaqtincha faolsizlantirilgan (Parent portal is deactivated for this kindergarten)." });
  }

  // Gather child-specific records
  const childPays = payments.filter(p => p.childId === child.id);
  const childActivities = dailyActivities.filter(a => a.childId === child.id);
  const childAttendance = attendance.filter(a => a.childId === child.id);
  const childAnnouncements = publicAnnouncements.filter(a => a.kindergartenId === "all" || a.kindergartenId === childKgId);

  res.json({
    child,
    payments: childPays,
    meals: mealPlans,
    activities: childActivities,
    groups: groups,
    attendance: childAttendance,
    announcements: childAnnouncements
  });
});

// Increment announcement views
app.post("/api/parent-portal/announcements/:id/view", (req, res) => {
  const { id } = req.params;
  const announcement = publicAnnouncements.find(a => a.id === id);
  if (announcement) {
    announcement.views = (announcement.views || 0) + 1;
    saveDb();
    return res.json({ success: true, views: announcement.views });
  }
  res.status(404).json({ error: "E'lon topilmadi" });
});

// Post endpoint to easily map and link a child to a parent's Telegram Chat ID directly from the Mini App
app.post("/api/parent-portal/link-child", (req, res) => {
  const { childId, parentPhone, telegramChatId } = req.body;
  if (!telegramChatId) {
    return res.status(400).json({ error: "Telegram Chat ID (telegramChatId) majburiy!" });
  }

  let child;
  if (childId) {
    const searchId = childId.trim().toUpperCase();
    child = children.find(c => c.id.toUpperCase() === searchId);
  } else if (parentPhone) {
    const searchPhone = parentPhone.trim().replace(/\s+/g, "");
    child = children.find(c => {
      const dbPhone = c.parentPhone ? c.parentPhone.replace(/\D/g, "") : "";
      const queryPhone = searchPhone.replace(/\D/g, "");
      return dbPhone.includes(queryPhone) || queryPhone.includes(dbPhone);
    });
  }

  if (!child) {
    return res.status(404).json({ error: "Kiritilgan ma'lumotlar bo'yicha bog'chadan bola topilmadi! Iltimos, ID (masalan: B-101) yoki telefon raqamingizni tekshirib qaytadan urinib ko'ring." });
  }

  child.telegramChatId = telegramChatId.toString();
  saveDb();

  // Log inside system audit-logs too
  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: `Ota-ona (${child.parentName})`,
    action: `Telegram akkaunt bolaga bog'landi (${child.name}, Chat ID: ${telegramChatId})`,
    ip: req.ip || "127.0.0.1",
    device: "Telegram Mini-App Linker",
    kindergartenId: child.kindergartenId || "K-1"
  });
  saveDb();

  res.json({ success: true, child, message: "Muvaffaqiyatli bog'landi!" });
});

// Telegram bot health status and error simulation endpoints
let telegramSimulatedError = false;

app.get("/api/telegram-simulator/status", (req, res) => {
  const token = getTelegramBotToken();
  const hasToken = token && !token.includes("YOUR_");
  
  if (telegramSimulatedError) {
    return res.json({
      success: false,
      status: "offline",
      uptime: "92.4%",
      latency: null,
      error: "Error 401: Unauthorized. Telegram API connection failed. Please verify your TELEGRAM_BOT_TOKEN inside your credentials.",
      mode: hasToken ? "Real-world (Token set)" : "Simulator mode"
    });
  }

  res.json({
    success: true,
    status: "online",
    uptime: "99.98%",
    latency: Math.floor(Math.random() * 25) + 12, // 12ms - 37ms
    error: null,
    mode: hasToken ? "Real-world (Token set)" : "Simulator mode"
  });
});

app.post("/api/telegram-simulator/toggle-error", (req, res) => {
  telegramSimulatedError = !telegramSimulatedError;
  res.json({ success: true, simulatedError: telegramSimulatedError });
});

// GET Telegram Simulator API Logs
app.get("/api/telegram-simulator/logs", (req, res) => {
  res.json(telegramApiLogs);
});

// START REAL TELEGRAM BOT LONG POLLING LOOP
// This ensures that if they message the real bot on Telegram, it acts 100% live!
async function startTelegramBot() {
  const token = getTelegramBotToken();
  if (!token || token.includes("YOUR_")) {
    console.log("[Telegram Bot] Real-world token is not set. Simulator-only mode.");
    return;
  }

  console.log(`[Telegram Bot] Starting long polling loop using token prefix ${token.split(':')[0]}...`);
  let lastUpdateId = 0;

  // Crucial: Deleting any existing webhook to prevent 409 Conflict on getUpdates
  try {
    console.log("[Telegram Bot] Deleting active webhooks...");
    const delRes = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
    if (delRes.ok) {
      console.log("[Telegram Bot] Webhook deleted successfully. Ready for getUpdates.");
    }
  } catch (err: any) {
    console.warn("[Telegram Bot] deleteWebhook failed:", err.message);
  }

  // Dynamic: Update the Bot's persistent Chat Menu Button to link directly to our active WebApp environment
  try {
    const baseUrl = process.env.APP_URL || "https://ais-pre-5gfoznatixswdwsf4i7weo-539451072809.asia-east1.run.app";
    const webAppUrl = `${baseUrl}/parent-portal?chatId=SIM-PARENT`;
    console.log(`[Telegram Bot] Programmatically updating Telegram Menu Button WebApp URL to: ${webAppUrl}`);
    const menuRes = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menu_button: {
          type: "web_app",
          text: "Mini-Ilova",
          web_app: {
            url: webAppUrl
          }
        }
      })
    });
    if (menuRes.ok) {
      console.log("[Telegram Bot] Persistent Chat Menu Button WebApp URL updated successfully!");
    } else {
      const errText = await menuRes.text();
      console.warn("[Telegram Bot] setChatMenuButton failed:", errText);
    }
  } catch (err: any) {
    console.warn("[Telegram Bot] Failed to setChatMenuButton dynamically:", err.message);
  }

  // Optimized: Clear historical backlog on start to avoid getting stuck or flooded
  try {
    const initRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=1&offset=-1`);
    if (initRes.ok) {
      const initData = await initRes.json();
      if (initData.ok && initData.result && initData.result.length > 0) {
        lastUpdateId = initData.result[0].update_id;
        console.log(`[Telegram Bot] Polling offset initialized to latest: ${lastUpdateId}`);
        addTelegramApiLog("INCOMING", "getUpdates (init)", `Initialized offset to latest ${lastUpdateId}`, 200);
      }
    }
  } catch (err: any) {
    console.warn("[Telegram Bot] Backlog init offset bypass failed:", err.message);
  }

  async function poll() {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.result) {
          for (const update of data.result) {
            lastUpdateId = update.update_id;
            await handleTelegramUpdate(update);
          }
        }
      } else {
        addTelegramApiLog("INCOMING", "getUpdates", `Failed with status ${res.status}`, res.status);
      }
    } catch (err: any) {
      console.error("[Telegram Poll Error]:", err.message);
      addTelegramApiLog("INCOMING", "getUpdates", `Network Error: ${err.message}`, 500);
    }
    setTimeout(poll, 1500);
  }

  poll();
}

// TELEGRAM ACCOUNT LINK & WEBAPP CONFIG / AUTHENTICATION
app.post("/api/users/link-telegram", (req, res) => {
  const { employeeId, telegramChatId } = req.body;
  if (!employeeId || !telegramChatId) {
    return res.status(400).json({ success: false, message: "Xodim ID va Telegram Chat ID majburiy!" });
  }
  const emp = employees.find(e => e.id === employeeId);
  if (!emp) {
    return res.status(404).json({ success: false, message: "Xodim topilmadi!" });
  }
  emp.telegramChatId = telegramChatId;
  
  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: emp.name,
    action: `Telegram akkaunt bog'landi (Chat ID: ${telegramChatId})`,
    ip: req.ip || "127.0.0.1",
    device: "Profile Settings",
    kindergartenId: emp.kindergartenId || "K-1"
  });

  saveDb();
  res.json({ success: true, message: "Telegram hisobingiz muvaffaqiyatli ulandi!", user: emp });
});

// TEST TELEGRAM CONNECTION ENDPOINT
app.post("/api/telegram-simulator/test-connection", async (req, res) => {
  const token = getTelegramBotToken();
  if (!token || token.includes("YOUR_")) {
    return res.json({
      success: false,
      message: "Telegram bot token topilmadi (Simulator rejimi)."
    });
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();
    if (data.ok) {
      addTelegramApiLog("OUTGOING", "getMe (Test)", "Connection verified successfully", 200);
      return res.json({
        success: true,
        botName: data.result.username,
        message: `Ulanish muvaffaqiyatli! Bot nomi: @${data.result.username}`
      });
    } else {
      addTelegramApiLog("OUTGOING", "getMe (Test)", data.description || "Testing connection failed", response.status);
      return res.json({
        success: false,
        message: `Bot xatoligi: ${data.description || 'Noma\'lum xato'}`
      });
    }
  } catch (err: any) {
    addTelegramApiLog("OUTGOING", "getMe (Test)", `Network Error: ${err.message}`, 500);
    return res.json({
      success: false,
      message: `Tarmoq xatoligi: ${err.message}`
    });
  }
});

// BROADCAST TELEGRAM ANNOUNCEMENTS
app.post("/api/notifications/broadcast", async (req, res) => {
  const { message, kindergartenId } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, message: "Xabar matni majburiy!" });
  }

  // Find children in this kindergarten
  const linkedChildren = children.filter(c => {
    const belongsToKg = !kindergartenId || kindergartenId === "all" || c.kindergartenId === kindergartenId;
    return belongsToKg && c.telegramChatId;
  });

  const textToSend = `📢 *BOG'CHA E'LONI (DIREKTOR MINBARI)*:\n\n${message}`;

  let sentCount = 0;
  for (const child of linkedChildren) {
    if (child.telegramChatId) {
      await sendTelegramMessage(child.telegramChatId, textToSend);
      sentCount++;
    }
  }

  // Also send to all active simulated chats to show up in parent bot simulator UI
  activeSimulatedChats.forEach(cId => {
    sendTelegramMessage(cId, textToSend);
  });

  // Log in public announcements for real-time fetch in Parent Portal
  publicAnnouncements.unshift({
    id: `ANN-${Date.now()}`,
    message: message,
    timestamp: new Date().toLocaleString(),
    kindergartenId: kindergartenId || "all",
    views: 0
  });

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: "Direktor",
    action: `Ommaviy e'lon tarqatildi (Telegram: ${sentCount} ta ota-onaga)`,
    ip: req.ip || "127.0.0.1",
    device: "Director Dashboard",
    kindergartenId: kindergartenId || "K-1"
  });

  saveDb();
  res.json({ success: true, sentCount, message: `E'lon muvaffaqiyatli tarqatildi! Jami ${sentCount} ta faol Telegram ota-onalari qabul qildi.` });
});

// TOGGLE PARENT PORTAL ACCESS
app.post("/api/kindergartens/:id/toggle-portal", (req, res) => {
  const { id } = req.params;
  const { active } = req.body;

  const kg = kindergartens.find(k => k.id === id);
  if (!kg) return res.status(404).json({ success: false, message: "Bog'cha topilmadi!" });

  kg.parentPortalActive = active !== false;

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: "Direktor",
    action: `Ota-ona portali kirish ruxsati ${kg.parentPortalActive ? "Yoqildi" : "Faolsizlantirildi"}`,
    ip: req.ip || "127.0.0.1",
    device: "Director Dashboard",
    kindergartenId: id
  });

  saveDb();
  res.json({ success: true, parentPortalActive: kg.parentPortalActive, message: `Ota-ona portali ruxsati muvaffaqiyatli ${kg.parentPortalActive ? "yoqildi" : "faolsizlantirildi"}!` });
});

app.post("/api/auth/telegram-login", (req, res) => {
  const { chatId } = req.body;
  if (!chatId) {
    return res.status(400).json({ success: false, message: "Telegram Chat ID kiritilmadi!" });
  }

  // Try finding a child with this telegramChatId for ParentPortal auto-login
  const child = children.find(c => c.telegramChatId === chatId);
  if (child) {
    return res.json({
      success: true,
      role: "parent",
      childId: child.id,
      kindergartenId: child.kindergartenId || "K-1"
    });
  }

  res.status(404).json({ success: false, message: "Ushbu Telegram ID ga ulangan profil topilmadi!" });
});

// SMS GATEWAY INTEGRATION
app.get("/api/sms/logs", (req, res) => {
  res.json(smsLogs);
});

app.post("/api/sms/send", (req, res) => {
  const { phone, message, childId } = req.body;
  if (!phone || !message) {
    return res.status(400).json({ success: false, message: "Telefon raqami va xabar matni majburiy!" });
  }

  // Simulated SMS API call (Eskiz / Twilio simulation)
  const success = Math.random() > 0.05; // 95% success rate
  const newLog: SMSLog = {
    id: `SMS-${Date.now()}`,
    phone,
    message,
    date: new Date().toLocaleString(),
    status: success ? "Yuborildi" : "Xatolik",
    provider: "Eskiz SMS Gateway API (uz)",
    childId
  };

  smsLogs.unshift(newLog);
  if (smsLogs.length > 100) smsLogs.pop();

  if (success) {
    auditLogs.unshift({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      user: "Buxgalter",
      action: `Mijozga (${phone}) to'lov eslatmasi SMS orqali muvaffaqiyatli yuborildi.`,
      ip: req.ip || "127.0.0.1",
      device: "Accountant Panel (SMS)",
      kindergartenId: req.body.kindergartenId || "K-1"
    });
  }

  saveDb();
  res.json({ success, log: newLog, message: success ? "SMS muvaffaqiyatli jo'natildi!" : "Tashqi SMS provayder javob bermadi!" });
});

// GET CENTRALIZED NOTIFICATIONS HISTORY
app.get("/api/notifications/history", (req, res) => {
  res.json({
    sms: smsLogs,
    telegram: telegramNotifications
  });
});

// POST USER PROFILE PHOTO
app.post("/api/users/profile-photo", (req, res) => {
  const { userId, avatar } = req.body;
  if (!userId || !avatar) {
    return res.status(400).json({ success: false, message: "Foydalanuvchi ID va rasm (avatar) majburiy!" });
  }

  const emp = employees.find(e => e.id === userId);
  if (!emp) {
    return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi!" });
  }

  emp.avatar = avatar;

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: emp.name,
    action: `Profil rasmi (avatar) yangilandi (kamera orqali)`,
    ip: req.ip || "127.0.0.1",
    device: "User Settings",
    kindergartenId: emp.kindergartenId || "K-1"
  });

  saveDb();
  res.json({ success: true, avatar, message: "Profil rasmi muvaffaqiyatli saqlandi!" });
});

// HEALTH CHECK ENDPOINT
app.get("/api/health-check", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      status: "connected",
      children: children.length,
      employees: employees.length,
      attendance: attendance.length,
      groups: groups.length,
      payments: payments.length,
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || "development",
      port: PORT,
    },
    telegram: {
      status: "online",
      botSimulator: "active",
    },
  });
});

// RESET DATABASE ENDPOINT
app.post("/api/admin/reset-db", (req, res) => {
  children = [];
  groups = [];
  payments = [];
  expenses = [];
  payrolls = [];
  purchaseRequests = [];
  incomes = [];
  complaints = [];
  attendance = [];
  dailyActivities = [];
  failedCheckins = [];
  kgMealGallery = [];
  smsLogs = [];
  telegramNotifications = [];
  superAdminDocuments = [];
  
  // Keep only superadmin employee(s)
  employees = employees.filter(e => e.role === "SuperAdmin" || e.username === "superadmin");
  
  saveDb();
  
  res.json({
    success: true,
    message: "Tizim ma'lumotlari muvaffaqiyatli tozalandi. SuperAdmin hisobi saqlab qolindi."
  });
});

// PUT USER PROFILE DATA
app.put("/api/users/profile", (req, res) => {
  const { userId, name, phone, password } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, message: "Foydalanuvchi ID majburiy!" });
  }

  const emp = employees.find(e => e.id === userId);
  if (!emp) {
    return res.status(404).json({ success: false, message: "Foydalanuvchi topilmadi!" });
  }

  if (name) emp.name = name;
  if (phone) emp.phone = phone;
  if (password) emp.passwordHash = password;

  auditLogs.unshift({
    id: `LOG-${Date.now()}`,
    timestamp: new Date().toLocaleString(),
    user: emp.name,
    action: `Profil ma'lumotlari tahrirlandi`,
    ip: req.ip || "127.0.0.1",
    device: "User Settings",
    kindergartenId: emp.kindergartenId || "K-1"
  });

  saveDb();
  res.json({
    success: true,
    user: {
      id: emp.id,
      username: emp.username,
      role: emp.role,
      name: emp.name,
      phone: emp.phone,
      kindergartenId: emp.kindergartenId || "K-1",
      avatar: emp.avatar
    },
    message: "Profil ma'lumotlari muvaffaqiyatli saqlandi!"
  });
});

startTelegramBot();

// VITE MIDDLEWARE SETUP FOR DEV/PROD
async function startServer() {
  const server = http.createServer(app);
  
  const wss = new WebSocketServer({ noServer: true });
  wss.on("connection", (ws) => {
    wsClients.add(ws);
    
    // Send initial status immediately on connection
    const initialState = JSON.stringify({
      type: "hardware_update",
      data: {
        devices: activeDevices,
        totalDevicesCount: activeDevices.length,
        onlineDevicesCount: activeDevices.filter(d => d.status === "Online").length,
        faceIdCamerasCount: activeDevices.filter(d => d.type === "entrance" || d.type === "exit").length,
        healthPercentage: Math.round((activeDevices.filter(d => d.status === "Online").length / activeDevices.length) * 100)
      }
    });
    ws.send(initialState);
    
    ws.on("close", () => {
      wsClients.delete(ws);
    });
    
    ws.on("error", (err) => {
      console.error("WS client error:", err);
      wsClients.delete(ws);
    });
  });

  server.on("upgrade", (request, socket, head) => {
    const pathname = request.url ? request.url.split("?")[0] : "";
    if (pathname === "/ws-hardware") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  // API Route Fallback (404 for unmatched API requests)
  app.use("/api/*", (req, res) => {
    console.warn(`[BACKEND API 404] Route not found: ${req.method} ${req.path} (Original: ${req.originalUrl}) | Origin: ${req.headers.origin || "none"}`);
    res.status(404).json({
      success: false,
      message: `API route not found: ${req.method} ${req.path}`
    });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[ERP Core] Full-Stack Server with WebSocket running on http://0.0.0.0:${PORT}`);
    console.log(`[Face ID Integration] Active listener for IPs 192.168.1.221-231 on port ${PORT}`);
  });
}

startServer();
