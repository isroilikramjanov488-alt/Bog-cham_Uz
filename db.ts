import pg from "pg";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// 1. PostgreSQL Pool setup (Lazy initialization)
let pool: pg.Pool | null = null;
let pgConnected = false;
let pgConnecting = false;
let pgConnectionAttempted = false;

export function getPool(): pg.Pool | null {
  if (pool) return pool;
  if (pgConnectionAttempted && !pgConnected) return null; // Don't retry if it failed before!

  const user = process.env.PG_USER;
  const password = process.env.PG_PASSWORD;
  const host = process.env.PG_HOST;
  const port = process.env.PG_PORT;
  const database = process.env.PG_DATABASE;

  if (!user || !host || !database) {
    console.log("[DB] PostgreSQL configuration missing or incomplete. Using local JSON store.");
    pgConnectionAttempted = true;
    return null;
  }

  if (pgConnecting) return null;
  pgConnecting = true;
  pgConnectionAttempted = true;

  try {
    const tempPool = new Pool({
      user,
      password,
      host,
      port: port ? parseInt(port, 10) : 5432,
      database,
      connectionTimeoutMillis: 2000, // short timeout to fail fast
    });
    
    // Quick test query to verify connection
    tempPool.query("SELECT NOW()", (err) => {
      pgConnecting = false;
      if (err) {
        console.warn("[DB] PostgreSQL connection failed. Falling back to local JSON store.", err.message);
        pool = null;
        pgConnected = false;
      } else {
        console.log("[DB] PostgreSQL connected successfully.");
        pool = tempPool;
        pgConnected = true;
      }
    });

    return tempPool;
  } catch (err: any) {
    console.error("[DB] Failed to initialize PostgreSQL pool:", err.message);
    pool = null;
    pgConnected = false;
    pgConnecting = false;
    return null;
  }
}

export function isPg(): boolean {
  if (!pgConnectionAttempted) {
    getPool(); // trigger first check
  }
  return pgConnected;
}

// 2. Local Fallback Database State (Matches server.ts exactly)
const DB_FILE = path.join(process.cwd(), "db_data.json");

export interface DbState {
  kindergartens: any[];
  children: any[];
  groups: any[];
  employees: any[];
  attendance: any[];
  mealPlans: any[];
  dailyActivities: any[];
  payments: any[];
  expenses: any[];
  payrolls: any[];
  purchaseRequests: any[];
  incomes: any[];
  complaints: any[];
  publicAnnouncements: any[];
  auditLogs: any[];
  kgIngredients: any[];
  kgRecipes: any[];
  kgMealGallery: any[];
  superAdminDocuments: any[];
  smsLogs: any[];
  telegramNotifications: any[];
  activeDevices: any[];
  failedCheckins: any[];
}

export let dbState: DbState = {
  kindergartens: [],
  children: [],
  groups: [],
  employees: [],
  attendance: [],
  mealPlans: [],
  dailyActivities: [],
  payments: [],
  expenses: [],
  payrolls: [],
  purchaseRequests: [],
  incomes: [],
  complaints: [],
  publicAnnouncements: [],
  auditLogs: [],
  kgIngredients: [],
  kgRecipes: [],
  kgMealGallery: [],
  superAdminDocuments: [],
  smsLogs: [],
  telegramNotifications: [],
  activeDevices: [],
  failedCheckins: []
};

// Load initial data from db_data.json on module load
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const data = JSON.parse(raw);
    dbState = {
      kindergartens: data.kindergartens || [],
      children: data.children || [],
      groups: data.groups || [],
      employees: data.employees || [],
      attendance: data.attendance || [],
      mealPlans: data.mealPlans || [],
      dailyActivities: data.dailyActivities || [],
      payments: data.payments || [],
      expenses: data.expenses || [],
      payrolls: data.payrolls || [],
      purchaseRequests: data.purchaseRequests || [],
      incomes: data.incomes || [],
      complaints: data.complaints || [],
      publicAnnouncements: data.publicAnnouncements || [],
      auditLogs: data.auditLogs || [],
      kgIngredients: data.kgIngredients || [],
      kgRecipes: data.kgRecipes || [],
      kgMealGallery: data.kgMealGallery || [],
      superAdminDocuments: data.superAdminDocuments || [],
      smsLogs: data.smsLogs || [],
      telegramNotifications: data.telegramNotifications || [],
      activeDevices: data.activeDevices || [],
      failedCheckins: data.failedCheckins || []
    };
    console.log("[DB] JSON Fallback store loaded successfully.");
  } else {
    console.log("[DB] No db_data.json found. Initializing empty local store for seeding.");
  }

  // Auto-seed with complete mock data if missing or only containing superadmin
  if (!dbState.employees || dbState.employees.length <= 1) {
    console.log("[DB] Seeding local database with rich mock data...");
    dbState.kindergartens = [
        {
          id: "K-1",
          name: "Nihol AI Bog'chasi (Chilonzor filiali)",
          address: "Toshkent sh., Chilonzor tumani, 5-mavze",
          phone: "+998711234567",
          directorName: "Karimov Shaxzod Baxtiyorovich",
          directorUsername: "director"
        }
      ];
      dbState.employees = [
        {
          id: "E-1",
          username: "superadmin",
          passwordHash: "admin135@",
          role: "SuperAdmin",
          name: "Asqarov Jamshid",
          phone: "+998909990000",
          passport: "AA1234567",
          birthDate: "1988-05-15",
          joinedDate: "2024-01-01",
          status: "Faol"
        },
        {
          id: "E-2",
          username: "director",
          passwordHash: "admin135@",
          role: "Direktor",
          name: "Karimov Shaxzod Baxtiyorovich",
          phone: "+998901112233",
          passport: "AB9876543",
          birthDate: "1982-11-22",
          joinedDate: "2024-03-10",
          status: "Faol",
          kindergartenId: "K-1"
        },
        {
          id: "E-3",
          username: "teacher",
          passwordHash: "admin135@",
          role: "Tarbiyachi",
          name: "Rahimova Nodira Shavkatovna",
          phone: "+998974445566",
          passport: "AC1112223",
          birthDate: "1994-08-05",
          joinedDate: "2024-09-01",
          status: "Faol",
          kindergartenId: "K-1"
        },
        {
          id: "E-4",
          username: "chef",
          passwordHash: "admin135@",
          role: "Oshpaz",
          name: "Abdullayev Rustam G'ofurovich",
          phone: "+998946667788",
          passport: "AD3334445",
          birthDate: "1975-02-14",
          joinedDate: "2024-05-01",
          status: "Faol",
          kindergartenId: "K-1"
        },
        {
          id: "E-5",
          username: "nurse",
          passwordHash: "admin135@",
          role: "Hamshira",
          name: "Soliqova Nilufar Alisherovna",
          phone: "+998937778899",
          passport: "AE5556667",
          birthDate: "1990-12-10",
          joinedDate: "2024-06-15",
          status: "Faol",
          kindergartenId: "K-1"
        },
        {
          id: "E-6",
          username: "accountant",
          passwordHash: "admin135@",
          role: "Buxgalter",
          name: "Xalilov Azizbek Husanovich",
          phone: "+998912223344",
          passport: "AF7778889",
          birthDate: "1985-04-18",
          joinedDate: "2024-04-01",
          status: "Faol",
          kindergartenId: "K-1"
        }
      ];
      dbState.groups = [
        {
          id: "G-1",
          name: "Kamalak (Katta guruh)",
          teacherId: "E-3",
          room: "102-xona",
          capacity: 25,
          ageRange: "5-6 yosh",
          kindergartenId: "K-1"
        },
        {
          id: "G-2",
          name: "Zvezdochka (O'rta guruh)",
          teacherId: "E-3",
          room: "104-xona",
          capacity: 20,
          ageRange: "4-5 yosh",
          kindergartenId: "K-1"
        }
      ];
      dbState.children = [
        {
          id: "B-101",
          name: "Alisherov Bilolbek",
          groupId: "G-1",
          birthDate: "2020-04-12",
          age: 6,
          gender: "O'g'il",
          parentName: "Alisherov Rustam",
          parentPhone: "+998901234567",
          telegramChatId: "SIM-PARENT",
          photo: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&q=80&w=200",
          status: "Faol",
          medicalCard: {
            allergies: "Yo'q",
            bloodGroup: "II",
            rhFactor: "+",
            height: 112,
            weight: 20,
            vaccinations: ["Gepatit B", "Bo'g'ma", "Ko'k yo'tal", "Qizamiq"]
          },
          kindergartenId: "K-1"
        },
        {
          id: "B-102",
          name: "Karimova Madina",
          groupId: "G-1",
          birthDate: "2021-09-05",
          age: 5,
          gender: "Qiz",
          parentName: "Karimova Shohida",
          parentPhone: "+998991112233",
          telegramChatId: "",
          photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200",
          status: "Faol",
          medicalCard: {
            allergies: "Shokolad",
            bloodGroup: "I",
            rhFactor: "+",
            height: 105,
            weight: 18,
            vaccinations: ["Gepatit B", "Polio", "Qizamiq"]
          },
          kindergartenId: "K-1"
        }
      ];
      dbState.attendance = [
        {
          id: "ATT-001",
          childId: "B-101",
          date: new Date().toISOString().split("T")[0],
          checkIn: "08:15",
          checkOut: null,
          status: "Keldi",
          temperature: 36.5,
          deviceIp: "192.168.1.221",
          kindergartenId: "K-1"
        },
        {
          id: "ATT-002",
          childId: "B-102",
          date: new Date().toISOString().split("T")[0],
          checkIn: "08:20",
          checkOut: null,
          status: "Keldi",
          temperature: 36.6,
          deviceIp: "192.168.1.221",
          kindergartenId: "K-1"
        }
      ];
      dbState.mealPlans = [
        {
          id: "MP-001",
          date: new Date().toISOString().split("T")[0],
          breakfast: {
            title: "Bo'tqa (Manni) va qora non sariyog' bilan, kakao",
            calories: 280,
            protein: 9,
            aiComment: "Ushbu nonushta bolalarning kun bo'yi baquvvat bo'lishini va aqliy faoliyatini yaxshilaydi."
          },
          lunch: {
            title: "Karam sho'rva, guruchli palov go'sht bilan, meva sharbati",
            calories: 520,
            protein: 22,
            aiComment: "Tushlik oqsillarga va uglevodlarga boy bo'lib, mushaklar o'sishi va energiya beradi."
          },
          dinner: {
            title: "Tvorogli zapekanka va limonli choy",
            calories: 310,
            protein: 14,
            aiComment: "Kechki taom kalsiy va oson hazm bo'luvchi oqsillarni ta'minlaydi."
          },
          kindergartenId: "K-1"
        }
      ];
      dbState.dailyActivities = [
        {
          id: "ACT-001",
          childId: "B-101",
          date: new Date().toISOString().split("T")[0],
          activities: ["Rasm chizish", "Ingliz tili - Alifbo", "Musiqiy o'yinlar"],
          engagement: 5,
          communication: 4,
          discipline: 5,
          feeding: 4,
          sleep: 2.5,
          teacherNote: "Bilolbek bugun rasm chizish darsida juda faol bo'ldi va yangi so'zlarni tez o'rgandi."
        }
      ];
      dbState.payments = [
        {
          id: "PAY-001",
          childId: "B-101",
          amount: 1500000,
          date: new Date().toISOString().split("T")[0],
          month: "Iyul",
          paymentType: "Payme",
          status: "To'langan",
          invoiceUrl: "https://example.com/invoice/pay-001",
          kindergartenId: "K-1"
        }
      ];
      dbState.activeDevices = [
        {
          id: "DEV-221",
          name: "Kirish darvozasi (Face ID Kamera)",
          ip: "192.168.1.221",
          status: "Online",
          type: "entrance",
          lastActivity: new Date().toLocaleTimeString()
        },
        {
          id: "DEV-222",
          name: "Chiqish darvozasi (Face ID Kamera)",
          ip: "192.168.1.222",
          status: "Online",
          type: "exit",
          lastActivity: new Date().toLocaleTimeString()
        }
      ];
      dbState.complaints = [
        {
          id: "CMP-101",
          parentName: "Alisherov Rustam",
          childId: "B-101",
          phone: "+998901234567",
          text: "Farzandimning kiyimlarini almashtirishga e'tiborliroq bo'lishingizni so'rayman.",
          date: new Date().toISOString().split("T")[0],
          status: "Yangi",
          kindergartenId: "K-1"
        }
      ];
      dbState.kgIngredients = [
        {
          id: "ING-1",
          name: "Guruch (Alanga)",
          category: "Cereals",
          quantity: 25,
          unit: "kg",
          supplier: "Chilonzor Oziq-Ovqat Baza",
          expirationDate: "2026-12-01",
          purchasePrice: 12000,
          status: "Yetarli"
        },
        {
          id: "ING-2",
          name: "Mol go'shti (Svejiy)",
          category: "Meat",
          quantity: 8,
          unit: "kg",
          supplier: "G'iyos aka (Go'sht yetkazib beruvchi)",
          expirationDate: "2026-07-25",
          purchasePrice: 85000,
          status: "Kam qolgan"
        }
      ];
      dbState.kgRecipes = [
        {
          id: "REC-1",
          title: "Osh (Palov)",
          category: "Hot Dish",
          instructions: "Go'sht va sabzini qovurish, guruch solib damlash.",
          ingredients: "Go'sht, Guruch, Sabzi, Piyoz",
          calories: 650,
          protein: 24,
          fat: 18,
          carb: 85,
          cost: 15000
        }
      ];
      dbState.kgMealGallery = [
        {
          id: "GAL-1",
          title: "Bugungi tushlik taomlari tayyor",
          url: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&q=80&w=400",
          date: new Date().toISOString().split("T")[0],
          type: "Tushlik",
          kindergartenId: "K-1",
          description: "Bolajonlarimiz uchun mazali palov va sabzavotli salat tayyorlandi!"
        }
      ];

      saveLocalDb();
      console.log("[DB] Local database successfully seeded with complete mock data!");
    }
} catch (err: any) {
  console.error("[DB] Error reading or seeding db_data.json:", err.message);
}

// Function to save dbState to db_data.json
export function saveLocalDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), "utf-8");
  } catch (err: any) {
    console.error("[DB] Error saving db_data.json:", err.message);
  }
}

// Resilient query runner
export async function query(text: string, params?: any[]): Promise<any> {
  const p = getPool();
  if (p && pgConnected) {
    try {
      const res = await p.query(text, params);
      return res;
    } catch (err: any) {
      console.error("[DB] PostgreSQL Query error, fallback might handle it:", err.message);
      throw err;
    }
  } else {
    throw new Error("[DB] PostgreSQL is offline. Performing fallback operations.");
  }
}
