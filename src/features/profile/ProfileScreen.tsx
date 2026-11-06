import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../../store';
import { SettingsScreen } from '../settings/SettingsScreen';
import { GoogleAuthModal } from '../auth/GoogleAuthModal';
import { DEFAULT_USER_PROFILE } from '../../domain/cardio';
import type { UserProfile } from '../../domain/types';
import {
  User,
  Sliders,
  Scale,
  Flame,
  Dumbbell,
  Calendar,
  X,
  Check,
  Award,
  Ruler,
  Percent,
  LogIn,
  LogOut,
  ShieldCheck,
  Users,
} from 'lucide-react';

export const ProfileScreen: React.FC = () => {
  const { settings, sessions, program, saveSettings, currentUser, users, switchUser, logout } = useAppStore();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const profile: UserProfile = useMemo(() => {
    return settings?.profile ?? DEFAULT_USER_PROFILE;
  }, [settings?.profile]);

  // Form states for all editable profile parameters
  const [gender, setGender] = useState<'male' | 'female'>(profile.gender);
  const [ageInput, setAgeInput] = useState<string>(profile.age.toString());
  const [heightInput, setHeightInput] = useState<string>((profile.height ?? 183).toString());
  const [weightInput, setWeightInput] = useState<string>(profile.weight.toString());
  const [fatInput, setFatInput] = useState<string>(profile.bodyFatPct.toString());

  // Keep form inputs synced when settings change externally
  useEffect(() => {
    if (settings?.profile) {
      setGender(settings.profile.gender);
      setAgeInput(settings.profile.age.toString());
      setHeightInput((settings.profile.height ?? 183).toString());
      setWeightInput(settings.profile.weight.toString());
      setFatInput(settings.profile.bodyFatPct.toString());
    }
  }, [settings?.profile]);

  // Handle saving profile changes
  const handleSaveProfile = async (overrides?: Partial<UserProfile>) => {
    if (!settings) return;

    const parsedAge = Math.max(10, Math.min(120, parseInt(ageInput, 10) || profile.age));
    const parsedHeight = Math.max(100, Math.min(250, parseInt(heightInput, 10) || profile.height || 183));
    const parsedWeight = Math.max(
      30,
      Math.min(300, parseFloat(weightInput.replace(',', '.')) || profile.weight)
    );
    const parsedFat = Math.max(
      3,
      Math.min(70, parseFloat(fatInput.replace(',', '.')) || profile.bodyFatPct)
    );

    const updatedProfile: UserProfile = {
      gender: overrides?.gender ?? gender,
      age: overrides?.age ?? parsedAge,
      height: overrides?.height ?? parsedHeight,
      weight: overrides?.weight ?? Math.round(parsedWeight * 10) / 10,
      bodyFatPct: overrides?.bodyFatPct ?? Math.round(parsedFat * 10) / 10,
      ...overrides,
    };

    await saveSettings({
      ...settings,
      profile: updatedProfile,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Derived body composition metrics
  const hM = (profile.height ?? 183) / 100;
  const bmi = Math.round((profile.weight / (hM * hM)) * 10) / 10;
  const leanMass = Math.round(profile.weight * (1 - profile.bodyFatPct / 100) * 10) / 10;
  const fatMass = Math.round(profile.weight * (profile.bodyFatPct / 100) * 10) / 10;

  // Compute aggregate stats from sessions
  const stats = useMemo(() => {
    let totalTonnage = 0;
    let totalCardioCalories = 0;
    let totalCardioMinutes = 0;
    let completedSessionsCount = 0;

    for (const session of sessions) {
      const hasDoneSets = session.entries.some((e) => e.sets.some((s) => s.done));
      if (hasDoneSets || session.cardioDone) {
        completedSessionsCount++;
      }

      // Tonnage
      for (const entry of session.entries) {
        if (entry.skipped) continue;
        for (const set of entry.sets) {
          if (set.done && set.weight && set.reps) {
            totalTonnage += set.weight * set.reps;
          }
        }
      }

      // Cardio
      if (session.cardioDone && session.cardio) {
        totalCardioMinutes += session.cardio.minutes || 0;
        totalCardioCalories += session.cardio.calories || 0;
      }
    }

    return {
      completedSessionsCount,
      totalTonnage: Math.round(totalTonnage),
      totalCardioCalories: Math.round(totalCardioCalories),
      totalCardioMinutes,
    };
  }, [sessions]);

  return (
    <div className="pb-32 max-w-2xl mx-auto px-3 sm:px-4 pt-3">
      {/* Header with Athlete Title and Small Square Options Button */}
      <div className="flex items-center justify-between border-b-2 border-yellow-400 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-yellow-400 text-black flex items-center justify-center font-black rounded-none shadow-[0_0_10px_rgba(250,204,21,0.4)]">
            <User className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight font-mono">
              ПРОФИЛЬ АТЛЕТА
            </h1>
            <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
              Личные параметры и статистика
            </p>
          </div>
        </div>

        {/* Small square options button inside Profile */}
        <button
          onClick={() => setShowSettingsModal(true)}
          className="w-10 h-10 rounded-none bg-neutral-950 hover:bg-yellow-400 text-yellow-400 hover:text-black border-2 border-yellow-400 flex items-center justify-center transition-all shadow-[0_0_8px_rgba(250,204,21,0.2)] active:scale-95"
          title="Открыть опции и настройки"
        >
          <Sliders className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {savedSuccess && (
        <div className="mb-4 p-2.5 bg-yellow-400 text-black font-mono text-xs font-black uppercase flex items-center gap-2 border border-yellow-400 shadow">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Параметры профиля сохранены!</span>
        </div>
      )}

      {/* Active Account & Google Auth Card */}
      <div className="bg-black border-2 border-yellow-400 rounded-none p-4 mb-5 shadow-[0_0_15px_rgba(250,204,21,0.15)]">
        <div className="flex items-center justify-between mb-3 border-b border-yellow-500/30 pb-2">
          <span className="text-xs font-mono font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            Аккаунт и изоляция данных
          </span>
          <span className="text-[10px] font-mono text-neutral-400 uppercase">
            {currentUser?.provider === 'google' ? 'Google Account' : 'Локальный'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-950 border border-neutral-800 p-3">
          <div className="flex items-center gap-3">
            {currentUser?.picture ? (
              <img
                src={currentUser.picture}
                alt={currentUser.name}
                className="w-11 h-11 rounded-none border-2 border-yellow-400 object-cover"
              />
            ) : (
              <div className="w-11 h-11 bg-yellow-400 text-black flex items-center justify-center font-black text-base font-mono">
                {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div>
              <div className="font-mono font-black text-white text-sm flex items-center gap-2">
                <span>{currentUser?.name || 'Атлет'}</span>
                {currentUser?.id === 'user_default' && (
                  <span className="text-[9px] bg-yellow-400 text-black px-1.5 py-0.2 font-mono font-black uppercase">
                    Основной
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono text-neutral-400">
                {currentUser?.email || 'Автономный режим на этом устройстве'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-mono text-xs font-black uppercase rounded-none transition-all shadow-[0_0_10px_rgba(250,204,21,0.3)] active:scale-95"
            >
              <LogIn className="w-4 h-4 stroke-[2.5]" />
              <span>Сменить</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm('Выйти из текущего профиля на этом устройстве?')) {
                  logout();
                }
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 text-red-400 hover:text-red-300 font-mono text-xs font-bold uppercase rounded-none border border-red-500/40 hover:border-red-400 transition-all active:scale-95"
              title="Выйти из аккаунта"
            >
              <LogOut className="w-4 h-4" />
              <span>Выйти</span>
            </button>
          </div>
        </div>

        {/* Quick Switch between saved athletes */}
        {users.length > 1 && (
          <div className="mt-3 pt-2.5 border-t border-neutral-900">
            <div className="text-[10px] font-mono uppercase text-neutral-400 tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Быстрое переключение профиля:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {users.map((u) => {
                const isSelected = u.id === currentUser?.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => switchUser(u.id)}
                    className={`px-2.5 py-1 text-[11px] font-mono uppercase rounded-none border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'border-yellow-400 bg-yellow-400 text-black font-black'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    <span>{u.name}</span>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-2.5 text-[10px] font-mono text-neutral-400 flex items-center gap-1.5">
          <span className="text-yellow-400 font-bold">ℹ</span>
          <span>Каждый атлет имеет персональный план, историю подходов и расчёт кардио.</span>
        </div>
      </div>

      {/* User Metrics Editable Card */}
      <div className="bg-black border-2 border-yellow-400 rounded-none p-4 mb-5 shadow-[0_0_15px_rgba(250,204,21,0.15)]">
        <div className="flex items-center justify-between mb-3 border-b border-yellow-500/30 pb-2">
          <span className="text-xs font-mono font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
            <Scale className="w-4 h-4 stroke-[2.5]" />
            Параметры тела (редактируемые)
          </span>
          <span className="text-[10px] font-mono text-neutral-400 uppercase">
            Для точного расчёта кардио
          </span>
        </div>

        {/* 5 Editable Parameter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {/* 1. Gender */}
          <div className="bg-neutral-950 border border-neutral-800 p-2.5 flex flex-col justify-between">
            <div className="text-[10px] font-mono text-neutral-400 uppercase mb-1">Пол</div>
            <div className="flex gap-1 mt-auto">
              <button
                type="button"
                onClick={() => {
                  setGender('male');
                  handleSaveProfile({ gender: 'male' });
                }}
                className={`flex-1 py-1 text-xs font-mono font-black uppercase border transition-colors ${
                  gender === 'male'
                    ? 'bg-yellow-400 text-black border-yellow-400'
                    : 'bg-black text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                МУЖ
              </button>
              <button
                type="button"
                onClick={() => {
                  setGender('female');
                  handleSaveProfile({ gender: 'female' });
                }}
                className={`flex-1 py-1 text-xs font-mono font-black uppercase border transition-colors ${
                  gender === 'female'
                    ? 'bg-yellow-400 text-black border-yellow-400'
                    : 'bg-black text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                ЖЕН
              </button>
            </div>
          </div>

          {/* 2. Age */}
          <div className="bg-neutral-950 border border-neutral-800 p-2.5">
            <div className="text-[10px] font-mono text-neutral-400 uppercase mb-1">Возраст</div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="numeric"
                min="10"
                max="120"
                value={ageInput}
                onChange={(e) => setAgeInput(e.target.value)}
                onBlur={() => handleSaveProfile()}
                className="w-full h-8 bg-black border border-neutral-700 text-center font-mono font-black text-base text-white focus:outline-none focus:border-yellow-400 rounded-none"
              />
              <span className="text-xs font-mono text-neutral-400 shrink-0">лет</span>
            </div>
            <div className="text-[9px] font-mono text-neutral-500 mt-1">18 лет</div>
          </div>

          {/* 3. Height */}
          <div className="bg-neutral-950 border border-yellow-500/50 p-2.5">
            <div className="text-[10px] font-mono text-yellow-400 uppercase mb-1 font-bold flex items-center gap-1">
              <Ruler className="w-3 h-3" />
              <span>Рост</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="numeric"
                min="100"
                max="250"
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                onBlur={() => handleSaveProfile()}
                className="w-full h-8 bg-black border border-yellow-400 text-center font-mono font-black text-base text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 rounded-none"
              />
              <span className="text-xs font-mono text-neutral-400 shrink-0">см</span>
            </div>
            <div className="text-[9px] font-mono text-neutral-400 mt-1">183 см</div>
          </div>

          {/* 4. Weight */}
          <div className="bg-neutral-950 border border-yellow-500/50 p-2.5">
            <div className="text-[10px] font-mono text-yellow-400 uppercase mb-1 font-bold">
              Вес (кг)
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="decimal"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                onBlur={() => handleSaveProfile()}
                className="w-full h-8 bg-black border border-yellow-400 text-center font-mono font-black text-base text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 rounded-none"
              />
              <span className="text-xs font-mono text-neutral-400 shrink-0">кг</span>
            </div>
            <div className="text-[9px] font-mono text-neutral-400 mt-1">91.3 — 93 кг</div>
          </div>

          {/* 5. Body Fat % */}
          <div className="bg-neutral-950 border border-neutral-800 p-2.5 col-span-2 sm:col-span-1">
            <div className="text-[10px] font-mono text-neutral-400 uppercase mb-1 flex items-center gap-1">
              <Percent className="w-3 h-3" />
              <span>Жир (%)</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="decimal"
                value={fatInput}
                onChange={(e) => setFatInput(e.target.value)}
                onBlur={() => handleSaveProfile()}
                className="w-full h-8 bg-black border border-neutral-700 text-center font-mono font-black text-base text-white focus:outline-none focus:border-yellow-400 rounded-none"
              />
              <span className="text-xs font-mono text-neutral-400 shrink-0">%</span>
            </div>
            <div className="text-[9px] font-mono text-neutral-500 mt-1">~27%</div>
          </div>
        </div>

        {/* Save Parameters Button */}
        <div className="mt-3.5 pt-3 border-t border-neutral-900 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[11px] font-mono text-neutral-400">
            ИМТ: <strong className="text-white">{bmi}</strong> · Сухая масса: <strong className="text-yellow-400">{leanMass} кг</strong> · Жир: <strong className="text-neutral-300">{fatMass} кг</strong>
          </div>

          <button
            type="button"
            onClick={() => handleSaveProfile()}
            className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-black text-xs uppercase tracking-wider rounded-none border border-yellow-400 flex items-center gap-1.5 transition-all shadow active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Сохранить параметры</span>
          </button>
        </div>
      </div>

      {/* Athlete Statistics Overview */}
      <div className="mb-5">
        <h2 className="text-xs font-mono font-black text-yellow-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Award className="w-4 h-4 stroke-[2.5]" />
          Общая статистика тренировок
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Workouts logged */}
          <div className="bg-neutral-950 border border-neutral-800 p-4">
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-mono uppercase mb-1">
              <Calendar className="w-4 h-4 text-yellow-400" />
              <span>Тренировок</span>
            </div>
            <div className="text-2xl font-mono font-black text-white">
              {stats.completedSessionsCount}
            </div>
            <div className="text-[10px] font-mono text-neutral-500 mt-1">Всего проведено</div>
          </div>

          {/* Total Tonnage */}
          <div className="bg-neutral-950 border border-neutral-800 p-4">
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-mono uppercase mb-1">
              <Dumbbell className="w-4 h-4 text-yellow-400" />
              <span>Общий тоннаж</span>
            </div>
            <div className="text-2xl font-mono font-black text-yellow-400">
              {stats.totalTonnage.toLocaleString('ru-RU')}
            </div>
            <div className="text-[10px] font-mono text-neutral-500 mt-1">кг поднятого веса</div>
          </div>

          {/* Cardio Calories */}
          <div className="bg-neutral-950 border border-neutral-800 p-4 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-mono uppercase mb-1">
              <Flame className="w-4 h-4 text-yellow-400" />
              <span>Кардио-расход</span>
            </div>
            <div className="text-2xl font-mono font-black text-white">
              {stats.totalCardioCalories.toLocaleString('ru-RU')}{' '}
              <span className="text-xs text-yellow-400 font-bold">ккал</span>
            </div>
            <div className="text-[10px] font-mono text-neutral-500 mt-1">
              {stats.totalCardioMinutes} мин кардио-активности
            </div>
          </div>
        </div>
      </div>

      {/* Program & Cycle Status */}
      {program && (
        <div className="bg-black border border-neutral-800 p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold text-neutral-400 uppercase">
              Текущая программа
            </span>
            <span className="text-xs font-mono font-black text-yellow-400 bg-neutral-900 border border-yellow-500/30 px-2 py-0.5 uppercase">
              {program.name}
            </span>
          </div>
          <p className="text-xs font-mono text-neutral-400">
            3-недельный ротационный силовой цикл: Объем (vol) · Средняя (mid) · Сила (str).
          </p>
        </div>
      )}

      {/* Fast access button to Settings */}
      <button
        onClick={() => setShowSettingsModal(true)}
        className="w-full py-3.5 bg-neutral-950 hover:bg-neutral-900 text-yellow-400 border border-yellow-500/40 hover:border-yellow-400 font-mono font-bold text-xs uppercase tracking-wider rounded-none flex items-center justify-center gap-2 transition-all shadow-[0_0_10px_rgba(250,204,21,0.1)] active:scale-98"
      >
        <Sliders className="w-4 h-4 stroke-[2.5]" />
        <span>Открыть опции (RPE, формулы, бэкап данных)</span>
      </button>

      {/* Settings Modal (Overlay) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col overflow-y-auto">
          <div className="sticky top-0 bg-black border-b-2 border-yellow-400 p-3.5 flex items-center justify-between max-w-2xl w-full mx-auto z-10">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-yellow-400" />
              <span className="font-mono font-black text-white uppercase text-base tracking-wider">
                ОПЦИИ И НАСТРОЙКИ
              </span>
            </div>
            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-9 h-9 border border-yellow-400 bg-neutral-950 hover:bg-yellow-400 text-yellow-400 hover:text-black flex items-center justify-center rounded-none transition-colors"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
          <div className="flex-1 max-w-2xl w-full mx-auto">
            <SettingsScreen />
          </div>
        </div>
      )}

      {/* Google & Multi-user Authentication Modal */}
      <GoogleAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
};
