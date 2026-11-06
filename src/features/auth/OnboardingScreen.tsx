import React, { useState } from 'react';
import { useAppStore } from '../../store';
import type { UserProfile } from '../../domain/types';
import {
  Scale,
  Ruler,
  Percent,
  Calendar,
  Dumbbell,
  ArrowRight,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

export const OnboardingScreen: React.FC = () => {
  const { currentUser, completeOnboarding, logout } = useAppStore();

  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState<string>('20');
  const [height, setHeight] = useState<string>('180');
  const [weight, setWeight] = useState<string>('80.0');
  const [bodyFat, setBodyFat] = useState<string>('20');
  const [submitting, setSubmitting] = useState(false);

  // Derived live metrics
  const hM = (parseFloat(height) || 180) / 100;
  const wKg = parseFloat(weight.replace(',', '.')) || 80;
  const fatPct = parseFloat(bodyFat.replace(',', '.')) || 20;
  const bmi = Math.round((wKg / (hM * hM)) * 10) / 10;
  const leanMass = Math.round(wKg * (1 - fatPct / 100) * 10) / 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const profile: UserProfile = {
      gender,
      age: Math.max(10, Math.min(120, parseInt(age, 10) || 20)),
      height: Math.max(100, Math.min(250, parseInt(height, 10) || 180)),
      weight: Math.max(30, Math.min(300, parseFloat(weight.replace(',', '.')) || 80)),
      bodyFatPct: Math.max(3, Math.min(70, parseFloat(bodyFat.replace(',', '.')) || 20)),
    };

    await completeOnboarding(profile);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-center px-4 py-8 max-w-xl mx-auto">
      {/* Top Welcome Card */}
      <div className="bg-black border-2 border-yellow-400 rounded-none p-5 mb-5 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
        <div className="flex items-center justify-between border-b border-yellow-500/30 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-yellow-400 text-black flex items-center justify-center font-black">
              <Dumbbell className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-yellow-400 font-bold">
                PRAXIS · РЕГИСТРАЦИЯ
              </span>
              <h1 className="text-xl sm:text-2xl font-mono font-black text-white uppercase tracking-tight">
                Создание профиля
              </h1>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="p-2 text-neutral-400 hover:text-white border border-neutral-800 hover:border-yellow-400 bg-neutral-950 transition-colors"
            title="Сменить аккаунт"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* User Info from Google */}
        <div className="flex items-center gap-3 p-3 bg-neutral-950 border border-neutral-800 mb-4">
          {currentUser?.picture ? (
            <img
              src={currentUser.picture}
              alt={currentUser.name}
              className="w-11 h-11 border border-yellow-400 rounded-none object-cover"
            />
          ) : (
            <div className="w-11 h-11 bg-yellow-400 text-black font-black flex items-center justify-center font-mono text-base">
              {currentUser?.name?.[0]?.toUpperCase() ?? 'A'}
            </div>
          )}
          <div className="flex-1 truncate">
            <div className="font-mono font-black text-sm text-white uppercase truncate">
              {currentUser?.name || 'Новый атлет'}
            </div>
            <div className="font-mono text-xs text-neutral-400 truncate">
              {currentUser?.email}
            </div>
          </div>
          <span className="text-[9px] font-mono font-bold text-yellow-400 border border-yellow-400/40 px-1.5 py-0.5 uppercase shrink-0">
            {currentUser?.provider === 'google' ? 'Google' : 'Email'}
          </span>
        </div>

        <p className="text-xs font-mono text-neutral-300 leading-relaxed">
          Укажите параметры тела для калибровки вашего плана и расчёта кардио-энергозатрат. Для вашего
          аккаунта будет создан <strong className="text-yellow-400">отдельный изолированный тренировочный план</strong>,
          к которому другие пользователи не будут иметь доступа.
        </p>
      </div>

      {/* Profile Creation Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Gender */}
        <div className="bg-neutral-950 border border-neutral-800 p-3.5">
          <label className="block text-[11px] font-mono uppercase text-neutral-400 font-bold mb-2">
            1. Пол атлета
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGender('male')}
              className={`py-3 text-xs font-mono font-black uppercase tracking-wider border transition-all ${
                gender === 'male'
                  ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]'
                  : 'bg-black text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              Мужской
            </button>
            <button
              type="button"
              onClick={() => setGender('female')}
              className={`py-3 text-xs font-mono font-black uppercase tracking-wider border transition-all ${
                gender === 'female'
                  ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]'
                  : 'bg-black text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              Женский
            </button>
          </div>
        </div>

        {/* Age & Height */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-950 border border-neutral-800 p-3.5">
            <label className="block text-[11px] font-mono uppercase text-neutral-400 font-bold mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-yellow-400" />
              <span>Возраст (лет)</span>
            </label>
            <input
              type="number"
              min="10"
              max="120"
              inputMode="numeric"
              required
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full h-12 bg-black border border-neutral-700 focus:border-yellow-400 text-white font-mono font-black text-lg text-center rounded-none focus:outline-none"
            />
          </div>

          <div className="bg-neutral-950 border border-neutral-800 p-3.5">
            <label className="block text-[11px] font-mono uppercase text-neutral-400 font-bold mb-2 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5 text-yellow-400" />
              <span>Рост (см)</span>
            </label>
            <input
              type="number"
              min="100"
              max="250"
              inputMode="numeric"
              required
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full h-12 bg-black border border-neutral-700 focus:border-yellow-400 text-white font-mono font-black text-lg text-center rounded-none focus:outline-none"
            />
          </div>
        </div>

        {/* Weight & Body Fat */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-neutral-950 border border-yellow-500/50 p-3.5">
            <label className="block text-[11px] font-mono uppercase text-yellow-400 font-bold mb-2 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              <span>Текущий вес (кг)</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              required
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full h-12 bg-black border border-yellow-400 text-white font-mono font-black text-lg text-center rounded-none focus:outline-none focus:ring-1 focus:ring-yellow-400"
            />
          </div>

          <div className="bg-neutral-950 border border-neutral-800 p-3.5">
            <label className="block text-[11px] font-mono uppercase text-neutral-400 font-bold mb-2 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-yellow-400" />
              <span>Процент жира (%)</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              className="w-full h-12 bg-black border border-neutral-700 focus:border-yellow-400 text-white font-mono font-black text-lg text-center rounded-none focus:outline-none"
            />
          </div>
        </div>

        {/* Real-time Calculation Badge */}
        <div className="p-3 bg-neutral-950 border border-yellow-500/40 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-yellow-400 shrink-0" />
            <span className="text-neutral-300">
              ИМТ: <strong className="text-white">{bmi}</strong> · Сухая масса: <strong className="text-yellow-400">{leanMass} кг</strong>
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-mono font-black uppercase tracking-widest text-sm rounded-none border-2 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
        >
          <span>Создать план и начать тренировки</span>
          <ArrowRight className="w-5 h-5 stroke-[3]" />
        </button>
      </form>
    </div>
  );
};
