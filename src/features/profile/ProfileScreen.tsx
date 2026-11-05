import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store';
import { SettingsScreen } from '../settings/SettingsScreen';
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
} from 'lucide-react';

export const ProfileScreen: React.FC = () => {
  const { settings, sessions, program, saveSettings } = useAppStore();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [weightInput, setWeightInput] = useState<string>(
    settings?.profile?.weight?.toString() ?? DEFAULT_USER_PROFILE.weight.toString()
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  const profile: UserProfile = useMemo(() => {
    return settings?.profile ?? DEFAULT_USER_PROFILE;
  }, [settings?.profile]);

  // Handle saving profile changes
  const handleUpdateProfile = async (patch: Partial<UserProfile>) => {
    if (!settings) return;
    const updatedProfile: UserProfile = { ...profile, ...patch };
    await saveSettings({
      ...settings,
      profile: updatedProfile,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleWeightBlur = () => {
    const parsed = parseFloat(weightInput.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 30 && parsed < 300) {
      handleUpdateProfile({ weight: Math.round(parsed * 10) / 10 });
    } else {
      setWeightInput(profile.weight.toString());
    }
  };

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
              Личные данные и статистика
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
        <div className="mb-4 p-2.5 bg-yellow-400 text-black font-mono text-xs font-black uppercase flex items-center gap-2 border border-yellow-400">
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Данные профиля обновлены!</span>
        </div>
      )}

      {/* User Metrics Card */}
      <div className="bg-black border-2 border-yellow-400 rounded-none p-4 mb-5 shadow-[0_0_15px_rgba(250,204,21,0.15)]">
        <div className="flex items-center justify-between mb-3 border-b border-yellow-500/30 pb-2">
          <span className="text-xs font-mono font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1.5">
            <Scale className="w-4 h-4 stroke-[2.5]" />
            Параметры тела
          </span>
          <span className="text-[10px] font-mono text-neutral-400 uppercase">
            Для точного расчёта кардио
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Gender */}
          <div className="bg-neutral-950 border border-neutral-800 p-3">
            <div className="text-[10px] font-mono text-neutral-400 uppercase mb-1">Пол</div>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => handleUpdateProfile({ gender: 'male' })}
                className={`flex-1 py-1 text-xs font-mono font-black uppercase border transition-colors ${
                  profile.gender === 'male'
                    ? 'bg-yellow-400 text-black border-yellow-400'
                    : 'bg-black text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                МУЖ
              </button>
              <button
                type="button"
                onClick={() => handleUpdateProfile({ gender: 'female' })}
                className={`flex-1 py-1 text-xs font-mono font-black uppercase border transition-colors ${
                  profile.gender === 'female'
                    ? 'bg-yellow-400 text-black border-yellow-400'
                    : 'bg-black text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                ЖЕН
              </button>
            </div>
          </div>

          {/* Age */}
          <div className="bg-neutral-950 border border-neutral-800 p-3">
            <div className="text-[10px] font-mono text-neutral-400 uppercase mb-1">Возраст</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-mono font-black text-white">{profile.age}</span>
              <span className="text-xs font-mono text-neutral-400">лет</span>
            </div>
            <div className="text-[9px] font-mono text-neutral-500 mt-0.5">18 лет</div>
          </div>

          {/* Weight */}
          <div className="bg-neutral-950 border border-yellow-500/50 p-3">
            <div className="text-[10px] font-mono text-yellow-400 uppercase mb-1 font-bold">
              Текущий вес (кг)
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="decimal"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                onBlur={handleWeightBlur}
                className="w-16 h-8 bg-black border border-yellow-400 text-center font-mono font-black text-base text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 rounded-none"
              />
              <span className="text-xs font-mono text-neutral-400">кг</span>
            </div>
            <div className="text-[9px] font-mono text-neutral-400 mt-1">Норма: 91.3 — 93 кг</div>
          </div>

          {/* Body Fat */}
          <div className="bg-neutral-950 border border-neutral-800 p-3">
            <div className="text-[10px] font-mono text-neutral-400 uppercase mb-1">Процент жира</div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-mono font-black text-white">±{profile.bodyFatPct}</span>
              <span className="text-xs font-mono text-neutral-400">%</span>
            </div>
            <div className="text-[9px] font-mono text-neutral-500 mt-0.5">Оценка ~27%</div>
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-neutral-900 flex items-center justify-between text-[11px] font-mono text-neutral-400">
          <span>Формула расхода: MET × Вес (кг) × Время / 60</span>
          <span className="text-yellow-400 font-bold">Активно</span>
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
    </div>
  );
};
