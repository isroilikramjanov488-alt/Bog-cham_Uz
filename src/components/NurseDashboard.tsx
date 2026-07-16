import React, { useState, useEffect } from "react";
import { Activity, ShieldAlert, Heart, Calendar, RefreshCw, Save, CheckCircle, Scale } from "lucide-react";
import { Child } from "../types";

interface NurseDashboardProps {
  user: any;
  childrenList: Child[];
  onRefresh: () => void;
}

export default function NurseDashboard({ user, childrenList, onRefresh }: NurseDashboardProps) {
  const [selectedChildId, setSelectedChildId] = useState("");
  const [allergies, setAllergies] = useState("");
  const [bloodGroup, setBloodGroup] = useState("O (I)");
  const [rhFactor, setRhFactor] = useState("Positive (+)");
  const [height, setHeight] = useState(105);
  const [weight, setWeight] = useState(18);
  const [vaccinations, setVaccinations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [nurseTab, setNurseTab] = useState<"medical" | "settings">("medical");
  const [healthWarningsAlerts, setHealthWarningsAlerts] = useState<boolean>(() => localStorage.getItem("nurse_health_warnings") !== "false");
  const [emergencyComplaintsAlerts, setEmergencyComplaintsAlerts] = useState<boolean>(() => localStorage.getItem("nurse_emergency_complaints") !== "false");
  const [settingsSaved, setSettingsSaved] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("nurse_health_warnings", String(healthWarningsAlerts));
    localStorage.setItem("nurse_emergency_complaints", String(emergencyComplaintsAlerts));
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  useEffect(() => {
    if (childrenList.length > 0 && !selectedChildId) {
      setSelectedChildId(childrenList[0].id);
    }

    const handleJumpTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.tab) {
        const targetTab = customEvent.detail.tab;
        if (["medical", "settings"].includes(targetTab)) {
          setNurseTab(targetTab as any);
        }
      }
    };

    window.addEventListener("jump-to-nurse-tab", handleJumpTab);
    return () => {
      window.removeEventListener("jump-to-nurse-tab", handleJumpTab);
    };
  }, [childrenList]);

  // Sync state with selected child
  useEffect(() => {
    if (!selectedChildId) return;
    const child = childrenList.find((c) => c.id === selectedChildId);
    if (child) {
      setAllergies(child.medicalCard.allergies);
      setBloodGroup(child.medicalCard.bloodGroup);
      setRhFactor(child.medicalCard.rhFactor);
      setHeight(child.medicalCard.height);
      setWeight(child.medicalCard.weight);
      setVaccinations(child.medicalCard.vaccinations);
    }
  }, [selectedChildId, childrenList]);

  const handleCheckboxChange = (vac: string) => {
    if (vaccinations.includes(vac)) {
      setVaccinations(vaccinations.filter((v) => v !== vac));
    } else {
      setVaccinations([...vaccinations, vac]);
    }
  };

  const handleSaveMedical = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/medical/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: selectedChildId,
          allergies,
          bloodGroup,
          rhFactor,
          height,
          weight,
          vaccinations,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        onRefresh();
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const activeChild = childrenList.find((c) => c.id === selectedChildId);

  // Auto-BMI calculator
  const heightInMeters = height / 100;
  const bmi = heightInMeters > 0 ? (weight / (heightInMeters * heightInMeters)).toFixed(1) : "0.0";

  // Standard Uzbek children vaccines
  const vaccineOptions = ["BCG", "Hepatitis B", "Polio", "DTP", "Measles", "Mumps", "Rubella"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Kids medical roster */}
      <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 flex flex-col h-[580px]">
        <div>
          <h3 className="text-white font-bold text-sm tracking-wide flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-rose-500" />
            Tibbiy Ro'yxat
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">Tizim holati va tibbiy jurnallar bo'limi</p>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-850 shrink-0">
          <button 
            onClick={() => setNurseTab("medical")}
            className={`py-1.5 px-3 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${nurseTab === "medical" ? "bg-rose-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
          >
            🩺 Tibbiyot
          </button>
          <button 
            onClick={() => setNurseTab("settings")}
            className={`py-1.5 px-3 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${nurseTab === "settings" ? "bg-rose-500 text-slate-950" : "text-slate-400 hover:text-white"}`}
          >
            ⚙️ Sozlamalar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
          {nurseTab === "medical" ? (
            childrenList.map((c) => {
              const isSelected = c.id === selectedChildId;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedChildId(c.id)}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? "bg-slate-800 border-rose-500 shadow-lg"
                      : "bg-slate-950/60 border-slate-850 hover:bg-slate-850"
                  }`}
                >
                  <div>
                    <div className={`text-xs font-bold ${isSelected ? "text-white" : "text-slate-300"}`}>{c.name}</div>
                    <div className="flex gap-1.5 mt-1">
                      <span className="text-[9px] text-slate-500 font-mono">ID: {c.id}</span>
                      <span className="text-[9px] text-rose-400 font-mono font-semibold">Qon: {c.medicalCard.bloodGroup}</span>
                    </div>
                  </div>

                  <span className="text-[9px] bg-rose-500/10 text-rose-400 font-semibold px-2 py-0.5 rounded-full shrink-0">
                    {c.medicalCard.allergies !== "Yo'q" ? "⚠️ Allergiya" : "Sog'lom"}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 text-center space-y-3">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
                🩺
              </div>
              <div>
                <h4 className="text-white font-bold text-xs">{user?.name || "Tibbiy Hamshira"}</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Nihol AI Bog'chasi • Hamshira</p>
              </div>
              <hr className="border-slate-850" />
              <div className="text-left text-[10px] text-slate-400 space-y-1.5 font-mono">
                <div>🏢 Filial: Tashkent Branch</div>
                <div>📅 Navbatchilik: 08:00 - 18:00</div>
                <div>📱 Tel: +998 (90) 123-45-67</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Dynamic Content */}
      {nurseTab === "medical" ? (
        <form onSubmit={handleSaveMedical} className="lg:col-span-8 bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-5 h-[580px] overflow-y-auto pr-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest block">Tibbiy karta va Parametrlar</span>
              <h3 className="text-white font-bold text-base">{activeChild ? activeChild.name : "Bola ismi"}</h3>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold block uppercase font-mono">So'nggi tekshiruv:</span>
              <span className="text-xs text-rose-400 font-bold">{activeChild?.medicalCard.lastCheckup || "2026-07-02"}</span>
            </div>
          </div>

          {/* Dynamic Anthropometry (Height / Weight / BMI) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Scale className="w-4 h-4 text-emerald-400" />
              Antropometriya ko'rsatkichlari (Bo'y & Vazn o'sishi)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-850">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Bo'yi (sm):</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-bold font-mono outline-none text-sm"
                  />
                  <span className="text-slate-400 font-semibold text-xs shrink-0">sm</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">Vazni (kg):</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-white font-bold font-mono outline-none text-sm"
                  />
                  <span className="text-slate-400 font-semibold text-xs shrink-0">kg</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block uppercase">BMI (Tana Massa Indeksi):</span>
                <div className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-2.5 text-white font-black text-center text-sm font-mono flex items-center justify-center gap-1.5">
                  <span className="text-emerald-400">{bmi}</span>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold font-sans uppercase">
                    {Number(bmi) < 14 ? "Kam" : Number(bmi) > 18 ? "Ortiqcha" : "Norma"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Blood group & Rh factor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Qon guruhi:</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-white outline-none text-xs"
              >
                <option value="O (I)">O (I) - Birinchi</option>
                <option value="A (II)">A (II) - Ikkinchi</option>
                <option value="B (III)">B (III) - Uchinchi</option>
                <option value="AB (IV)">AB (IV) - To'rtinchi</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Rezerv-faktor (Rh):</label>
              <select
                value={rhFactor}
                onChange={(e) => setRhFactor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-white outline-none text-xs"
              >
                <option value="Positive (+)">Positive (Rh+)</option>
                <option value="Negative (-)">Negative (Rh-)</option>
              </select>
            </div>
          </div>

          {/* Allergies inputs */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              Allergiya va Tibbiy Ta'qiqlangan ovqatlar:
            </label>
            <input
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Shokolad, sitrus mevalar, sut mahsulotlari (Yo'q deb yozing, agar allergen bo'lmasa)"
              className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl py-2.5 px-3.5 text-white outline-none text-xs"
            />
          </div>

          {/* Vaccinations checklist */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Olgan Emlashlari (Vaktsinalar):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-4 bg-slate-950 rounded-2xl border border-slate-850">
              {vaccineOptions.map((vac) => {
                const isChecked = vaccinations.includes(vac);
                return (
                  <label
                    key={vac}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                      isChecked
                        ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                        : "bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-white"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleCheckboxChange(vac)}
                      className="accent-rose-500"
                    />
                    <span className="font-bold">{vac}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Submit action */}
          <div className="flex items-center justify-between pt-2">
            {savedSuccess && (
              <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                <CheckCircle className="w-4 h-4" />
                Tibbiy karta saqlandi va Telegram Bot ota-onaga push qilindi!
              </span>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-rose-500 hover:bg-rose-450 text-slate-950 font-black py-3 px-6 rounded-xl text-xs flex items-center gap-2 ml-auto cursor-pointer shadow-lg shadow-rose-500/10 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              TIBBIY MA'LUMOTNI SAQLASH
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSaveSettings} className="lg:col-span-8 bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-5 h-[580px] overflow-y-auto pr-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest block">Xabarnoma va Telegram sozlamalari</span>
              <h3 className="text-white font-bold text-base">Profil Sozlamalari (Hamshira)</h3>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Telegram Push-Bildirishnomalar</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Favqulodda vaziyatlar yoki tibbiy ogohlantirishlarni Telegram botingiz orqali real vaqtda olish sozlamalari.
            </p>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <span className="font-bold text-white text-xs block">Sog'liqni Saqlash Ogohlantirishlari</span>
                <span className="text-[10px] text-slate-500 block">Bolalar harorati ko'tarilganda, allergik xuruj yoki emlash muddati kelganda xabar olish.</span>
              </div>
              <button 
                type="button"
                onClick={() => setHealthWarningsAlerts(!healthWarningsAlerts)}
                className="cursor-pointer shrink-0"
              >
                {healthWarningsAlerts ? (
                  <span className="bg-rose-500 text-slate-950 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Yoqilgan</span>
                ) : (
                  <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">O'chirilgan</span>
                )}
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-850 flex items-center justify-between">
              <div className="space-y-0.5 pr-4">
                <span className="font-bold text-white text-xs block">Favqulodda Shikoyat Ogohlantirishlari</span>
                <span className="text-[10px] text-slate-500 block">Ota-onalar tomonidan bot orqali kiritilgan zudlik bilan ko'rilishi kerak bo'lgan shikoyatlar bo'yicha push-xabarnoma.</span>
              </div>
              <button 
                type="button"
                onClick={() => setEmergencyComplaintsAlerts(!emergencyComplaintsAlerts)}
                className="cursor-pointer shrink-0"
              >
                {emergencyComplaintsAlerts ? (
                  <span className="bg-rose-500 text-slate-950 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Yoqilgan</span>
                ) : (
                  <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">O'chirilgan</span>
                )}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            {settingsSaved && (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Sozlamalar muvaffaqiyatli saqlandi!
              </span>
            )}
            <button
              type="submit"
              className="bg-rose-500 hover:bg-rose-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wide cursor-pointer transition-all ml-auto"
            >
              Sozlamalarni Saqlash
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
