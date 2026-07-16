import React, { useState } from "react";
import { Lock, User as UserIcon, LogIn, Sparkles, Building, Globe, Send } from "lucide-react";
import { User } from "../types";
import { useTelegramWebApp } from "../hooks/useTelegramWebApp";

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  onEnterParentPortal?: () => void;
}

export default function LoginScreen({ onLoginSuccess, onEnterParentPortal }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState<"uz" | "ru">("uz");

  // Initialize Telegram WebApp hook
  const { isTelegramWebApp, tgUser } = useTelegramWebApp(onLoginSuccess);

  const demoAccounts = [
    { label: "Super Admin", user: "superadmin", pass: "admin135@", desc: "SaaS & Bog'chalar nazorati" },
    { label: "Direktor", user: "director", pass: "admin135@", desc: "To'liq bog'cha boshqaruvi" },
    { label: "Tarbiyachi", user: "teacher", pass: "admin135@", desc: "Davomat, baholar, faollik" },
    { label: "Oshpaz", user: "chef", pass: "admin135@", desc: "Taomnoma, AI Kaloriya tahlili" },
    { label: "Hamshira", user: "nurse", pass: "admin135@", desc: "Tibbiy kartalar, bo'y-vazn, emlash" },
    { label: "Buxgalter", user: "accountant", pass: "admin135@", desc: "Oylik to'lovlar, tushum, cheklar" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError(lang === "uz" ? "Iltimos, barcha maydonlarni to'ldiring!" : "Пожалуйста, заполните все поля!");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (data.success) {
        // If logged in inside Telegram WebApp, automatically link this user account to their Telegram Chat ID!
        if (isTelegramWebApp && tgUser) {
          try {
            await fetch("/api/users/link-telegram", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                employeeId: data.user.id,
                telegramChatId: String(tgUser.id),
              }),
            });
            console.log("Account successfully linked to Telegram Chat ID:", tgUser.id);
          } catch (linkErr) {
            console.error("Error linking account on login:", linkErr);
          }
        }
        
        onLoginSuccess(data.user);
      } else {
        setError(data.message || (lang === "uz" ? "Login yoki parol xato!" : "Неверный логин или пароль!"));
      }
    } catch (err) {
      setError(lang === "uz" ? "Serverga ulanishda xatolik yuz berdi." : "Ошибка подключения к serveru.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemo = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 md:p-8 font-sans">
      {/* Language selector */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-800 rounded-full px-3 py-1 border border-slate-700">
        <Globe className="w-4 h-4 text-emerald-400" />
        <button
          onClick={() => setLang("uz")}
          className={`text-xs font-semibold px-2 py-0.5 rounded ${lang === "uz" ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-white"}`}
        >
          UZ
        </button>
        <button
          onClick={() => setLang("ru")}
          className={`text-xs font-semibold px-2 py-0.5 rounded ${lang === "ru" ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-white"}`}
        >
          RU
        </button>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left column: Branding */}
        <div className="lg:col-span-5 text-center lg:text-left space-y-6">
          <div className="inline-flex items-center gap-3 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-semibold tracking-wide">
              {lang === "uz" ? "AI INTEGRATSIYALASHGAN TIZIM" : "ИНТЕГРИРОВАННАЯ ИИ-СИСТЕМА"}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-none">
            Nihol <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">AI ERP</span>
          </h1>

          <p className="text-slate-400 text-base md:text-lg max-w-md mx-auto lg:mx-0">
            {lang === "uz"
              ? "Zamonaviy bog'chalar uchun yagona boshqaruv, AI tahlili, Face ID davomati va Telegram Bot xizmati."
              : "Единое управление для современных детских садов с ИИ-аналитикой, Face ID и Telegram-ботом."}
          </p>
        </div>

        {/* Right column: Login form & Demo list */}
        <div className="lg:col-span-7 bg-slate-800 p-6 md:p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {lang === "uz" ? "Tizimga Kirish" : "Вход в систему"}
            </h2>
            <p className="text-slate-400 text-sm">
              {lang === "uz" ? "Yagona identifikatsiya login sahifasi" : "Единая страница авторизации персонала"}
            </p>
          </div>

          {isTelegramWebApp && (
            <div className="p-4 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-2xl flex items-center gap-3 animate-pulse">
              <div className="w-9 h-9 bg-sky-500/10 rounded-xl flex items-center justify-center text-sky-400 font-bold shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div className="text-xs">
                <div className="font-bold text-white uppercase tracking-wider">Telegram WebApp Rejimi</div>
                <div className="text-slate-300 mt-0.5">
                  {tgUser 
                    ? `Foydalanuvchi: @${tgUser.username || tgUser.first_name} (Chat ID: ${tgUser.id}). Tizimga kirsangiz, ushbu Telegram profili hisobingizga biriktiriladi va keyingi safar parolsiz kirasiz.`
                    : "Telegram orqali avtomatik bog'lanish va sessiya boshqaruvi faol."
                  }
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl text-sm font-medium animate-shake">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {lang === "uz" ? "Email yoki Login" : "Email или Логин"}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder={lang === "uz" ? "Foydalanuvchi nomini kiriting..." : "Введите логин..."}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 outline-none transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {lang === "uz" ? "Parol" : "Пароль"}
                </label>
                <a href="#forgot" className="text-xs text-emerald-400 hover:underline">
                  {lang === "uz" ? "Parolni unutdingizmi?" : "Забыли пароль?"}
                </a>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 outline-none transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 py-3.5 px-4 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  {lang === "uz" ? "Tizimga Kirish" : "Войти в систему"}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
