import React, { useEffect, useState } from 'react';
import { useAppStore } from './store';
import { TodayScreen } from './features/today/TodayScreen';
import { WorkoutScreen } from './features/workout/WorkoutScreen';
import { PlanScreen } from './features/plan/PlanScreen';
import { ProgressScreen } from './features/progress/ProgressScreen';
import { ProfileScreen } from './features/profile/ProfileScreen';
import { OnboardingScreen } from './features/auth/OnboardingScreen';
import { AuthScreen } from './features/auth/AuthScreen';
import { GoogleAuthModal } from './features/auth/GoogleAuthModal';
import { format } from 'date-fns';
import {
  CalendarDays,
  Dumbbell,
  Calendar,
  TrendingUp,
  User,
  Utensils,
  X,
} from 'lucide-react';

type Tab = 'today' | 'workout' | 'plan' | 'profile' | 'progress' | 'nutrition';

export const App: React.FC = () => {
  const { init, initialized, currentUser, onboardingRequired, forceInit } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [previousTab, setPreviousTab] = useState<Tab>('plan');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showBypassNotice, setShowBypassNotice] = useState<boolean>(false);
  const [showNutritionNotice, setShowNutritionNotice] = useState<boolean>(false);
  const [workoutDate, setWorkoutDate] = useState<string>(() =>
    format(new Date(), 'yyyy-MM-dd')
  );

  useEffect(() => {
    init();
    const timer = setTimeout(() => setShowBypassNotice(true), 2500);
    return () => clearTimeout(timer);
  }, [init]);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-neutral-400">
        <div className="w-12 h-12 border-2 border-neutral-800 border-t-yellow-400 rounded-none animate-spin mb-4" />
        <p className="font-mono text-xs uppercase tracking-widest text-yellow-400 font-bold">
          Инициализация Praxis...
        </p>
        {showBypassNotice && (
          <div className="flex flex-col items-center gap-3 text-center max-w-xs mt-4 animate-fade-in">
            <span className="text-[11px] font-mono text-neutral-400">
              Загрузка локальной базы данных...
            </span>
            <button
              onClick={() => forceInit()}
              className="px-4 py-2 border-2 border-yellow-400 bg-neutral-950 text-yellow-400 hover:bg-yellow-400 hover:text-black font-mono text-xs font-black uppercase transition-all shadow-[0_0_10px_rgba(250,204,21,0.3)] active:scale-95"
            >
              Войти в приложение
            </button>
          </div>
        )}
      </div>
    );
  }

  // If not authenticated, require registration/login with email & password
  if (!currentUser) {
    return <AuthScreen />;
  }

  // If a new user signs up or lacks onboarding, force profile creation first
  // so an isolated plan and calibrated settings are prepared
  if (onboardingRequired) {
    return <OnboardingScreen />;
  }

  const handleStartWorkout = (dateStr: string) => {
    setWorkoutDate(dateStr);
    setPreviousTab(activeTab === 'workout' ? 'plan' : activeTab);
    setActiveTab('workout');
  };

  const navItems: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'today', label: 'Сегодня', icon: Calendar },
    { id: 'plan', label: 'План', icon: CalendarDays },
    { id: 'profile', label: 'Профиль', icon: User },
    { id: 'progress', label: 'Прогресс', icon: TrendingUp },
    { id: 'nutrition', label: 'Питание', icon: Utensils },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col selection:bg-yellow-400 selection:text-black">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b-2 border-yellow-400 px-4 py-2.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-none bg-yellow-400 text-black flex items-center justify-center font-black shadow-[0_0_10px_rgba(250,204,21,0.4)]">
              <Dumbbell className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-black text-lg tracking-wider uppercase font-mono text-white">
                PRAXIS
              </span>
              <span className="text-[10px] text-yellow-400 font-mono font-bold uppercase tracking-widest border border-yellow-400/40 px-1 py-0.2">
                PRO 1.0
              </span>
            </div>
          </div>

          {/* User Account / Auth Button */}
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center gap-2 bg-neutral-950 border border-yellow-400/60 hover:border-yellow-400 px-2.5 py-1.5 transition-all text-left group active:scale-95"
            title="Сменить аккаунт / Войти через Google"
          >
            {currentUser?.picture ? (
              <img
                src={currentUser.picture}
                alt={currentUser.name}
                className="w-5 h-5 rounded-none border border-yellow-400 object-cover"
              />
            ) : (
              <div className="w-5 h-5 bg-yellow-400 text-black flex items-center justify-center font-black text-[10px] font-mono">
                {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div className="flex flex-col leading-tight">
              <span className="text-[11px] font-mono font-bold text-white group-hover:text-yellow-400 transition-colors truncate max-w-[85px] sm:max-w-[130px]">
                {currentUser?.name || 'Аккаунт'}
              </span>
              <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-wider">
                {currentUser?.provider === 'google' ? 'Google' : 'Профиль'}
              </span>
            </div>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl mx-auto">
        {activeTab === 'today' && (
          <TodayScreen onStartWorkout={handleStartWorkout} />
        )}
        {activeTab === 'workout' && (
          <WorkoutScreen
            selectedDate={workoutDate}
            onDateChange={(d) => setWorkoutDate(d)}
            onFinish={() => setActiveTab(previousTab === 'workout' ? 'plan' : previousTab)}
            onBack={() => setActiveTab(previousTab === 'workout' ? 'plan' : previousTab)}
          />
        )}
        {activeTab === 'plan' && (
          <PlanScreen onSelectDate={handleStartWorkout} />
        )}
        {activeTab === 'profile' && <ProfileScreen />}
        {activeTab === 'progress' && <ProgressScreen />}
      </main>

      {/* Bottom Navigation Bar (Strict Brutalist Style, Large touch targets) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-black/95 backdrop-blur-md border-t-2 border-yellow-400 pb-safe">
        <div className="max-w-2xl mx-auto flex items-stretch justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isProfile = item.id === 'profile';

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'nutrition') {
                    setShowNutritionNotice(true);
                    return;
                  }
                  setActiveTab(item.id);
                }}
                className={`flex-1 min-h-[52px] flex flex-col items-center justify-center py-1.5 px-0.5 rounded-none transition-colors border-t-2 -mt-[2px] ${
                  isActive
                    ? isProfile
                      ? 'border-white bg-neutral-950 text-white font-black shadow-[0_0_12px_rgba(255,255,255,0.2)]'
                      : 'border-yellow-400 bg-neutral-950 text-yellow-400 font-black'
                    : isProfile
                    ? 'border-transparent text-white hover:text-neutral-200 hover:bg-neutral-950'
                    : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-950'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isProfile
                      ? 'stroke-[2.6] text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                      : isActive
                      ? 'stroke-[2.5] text-yellow-400'
                      : 'stroke-2'
                  }`}
                />
                <span
                  className={`text-[10px] mt-1 font-mono uppercase tracking-wider truncate max-w-[56px] ${
                    isProfile
                      ? 'font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] tracking-widest'
                      : isActive
                      ? 'font-black'
                      : 'font-bold'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Nutrition (Dummy) Feature Notice Modal */}
      {showNutritionNotice && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-black border-2 border-yellow-400 p-5 max-w-sm w-full shadow-[0_0_25px_rgba(250,204,21,0.3)]">
            <div className="flex items-center justify-between border-b border-yellow-500/30 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-yellow-400 text-black flex items-center justify-center font-black">
                  <Utensils className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <span className="font-mono font-black text-white uppercase text-sm tracking-wider block">
                    ПИТАНИЕ (КБЖУ)
                  </span>
                  <span className="text-[10px] font-mono text-yellow-400 uppercase">
                    Скоро в Praxis
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowNutritionNotice(false)}
                className="w-7 h-7 border border-neutral-700 hover:border-yellow-400 text-neutral-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 mb-4 text-xs font-mono text-neutral-300 leading-relaxed">
              <div className="inline-block px-2 py-0.5 bg-yellow-400 text-black font-black text-[10px] uppercase mb-1">
                В РАЗРАБОТКЕ
              </div>
              <p>
                Раздел «Питание» находится в стадии активной разработки. В следующих обновлениях:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-neutral-400 text-[11px]">
                <li>Дневник калорий и макронутриентов (Белки, Жиры, Углеводы)</li>
                <li>Автоматический расчёт суточной нормы под ваши параметры ({currentUser?.name || 'Атлет'})</li>
                <li>Синхронизация с потраченными калориями из кардио-тренировок</li>
                <li>Режимы: Набор сухой массы · Сушка · Поддержание</li>
              </ul>
            </div>

            <button
              onClick={() => setShowNutritionNotice(false)}
              className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-mono text-xs font-black uppercase rounded-none transition-all shadow-[0_0_10px_rgba(250,204,21,0.3)] active:scale-95"
            >
              ПОНЯТНО
            </button>
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

export default App;
