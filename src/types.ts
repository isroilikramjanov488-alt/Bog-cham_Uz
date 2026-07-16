export interface User {
  id: string;
  username: string;
  role: "SuperAdmin" | "Direktor" | "Tarbiyachi" | "Oshpaz" | "Hamshira" | "Buxgalter";
  name: string;
  phone: string;
  kindergartenId?: string;
  telegramChatId?: string;
  avatar?: string;
}

export interface Kindergarten {
  id: string;
  name: string;
  address: string;
  phone: string;
  directorName: string;
  directorUsername: string;
  parentPortalActive?: boolean;
}

export interface Child {
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

export interface Group {
  id: string;
  name: string;
  teacherId: string;
  capacity: number;
  spots: number;
  kindergartenId?: string;
}

export interface Employee {
  id: string;
  username: string;
  role: "SuperAdmin" | "Direktor" | "Tarbiyachi" | "Oshpaz" | "Hamshira" | "Buxgalter";
  name: string;
  phone: string;
  passport: string;
  birthDate: string;
  joinedDate: string;
  status: "Faol" | "Nofaol";
  kindergartenId?: string;
  avatar?: string;
}

export interface Attendance {
  id: string;
  childId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: "Keldi" | "Ketdi" | "Kechikdi" | "Sababli" | "Sababsiz";
  reason: string | null;
  deviceIp: string | null;
  temperature?: number;
}

export interface MealDetail {
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

export interface MealPlan {
  date: string;
  breakfast: MealDetail;
  lunch: MealDetail;
  dinner: MealDetail;
}

export interface DailyActivity {
  id: string;
  childId: string;
  date: string;
  activities: string[];
  engagement: number;
  discipline: number;
  communication: number;
  feeding: number;
  sleep: number;
  teacherNote: string;
}

export interface Payment {
  id: string;
  childId: string;
  date: string;
  amount: number;
  paymentType: "Naqd" | "Click" | "Payme" | "Humo" | "Visa" | "Mastercard";
  month: string;
  status: "To'landi" | "Qisman" | "Qarzdor";
}

export interface Complaint {
  id: string;
  parentName: string;
  childId: string;
  phone: string;
  text: string;
  date: string;
  status: "Yangi" | "Ko'rildi" | "Hal etildi";
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  ip: string;
  device: string;
  kindergartenId?: string;
}

export interface SuperAdminDocument {
  id: string;
  title: string;
  allocatedFunds?: number;
  targetDirectorUsername: string;
  fileName: string;
  fileUrl: string;
  date: string;
  distributedToPanels: string[];
}

export interface PublicAnnouncement {
  id: string;
  message: string;
  timestamp: string;
  kindergartenId: string;
  views: number;
}

