import React, { useEffect, useState } from 'react';
import { useAppStore } from './store';
import { TodayScreen } from './features/today/TodayScreen';
import { WorkoutScreen } from './features/workout/WorkoutScreen';
import { PlanScreen } from './features/plan/PlanScreen';
import { ProgressScreen } from './features/progress/ProgressScreen';
import { ProgramEditorScreen } from './features/program-editor/ProgramEditorScreen';
import { ProfileScreen } from './features/profile/ProfileScreen';
import { OnboardingScreen } from './features/auth/OnboardingScreen';
import { GoogleAuthModal } from './features/auth/GoogleAuthModal';
import { format } from 'date-fns';
import {
  CalendarDays,
  Dumbbell,
  Calendar,
  TrendingUp,
  Sliders,
  User,
} from 'lucide-react';

type Tab = 'today' | 'workout' | 'plan' | 'progress' | 'program' | 'profile';

export const App: React.FC = () => {
  const { init, initialized, currentUser, onboardingRequired } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [workoutDate, setWorkoutDate] = useState<string>(() =>
    format(new Date(), 'yyyy-MM-dd')
  );

  useEffect(() => {
    init();
  }, [init]);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-neutral-400">
        <div className="w-12 h-12 border-2 border-neutral-800 border-t-yellow-400 rounded-none animate-spin mb-4" />
        <p className="font-mono text-xs uppercase tracking-widest text-yellow-400 font-bold">
          Инициализация Praxis...
        </p>
      </div>
    );
  }

  // If a new user signs up or lacks onboarding, force profile creation first
  // so an isolated plan and calibrated settings are prepared
  if (onboardingRequired) {
    return <OnboardingScreen />;
  }

  const handleStartWorkout = (dateStr: string) => {
    setWorkoutDate(dateStr);
    setActiveTab('workout');
  };

  const navItems: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'today', label: 'Сегодня', icon: Calendar },
    { id: 'workout', label: 'Зал', icon: Dumbbell },
    { id: 'plan', label: 'План', icon: CalendarDays },
    { id: 'progress', label: 'Прогресс', icon: TrendingUp },
    { id: 'program', label: 'Схема', icon: Sliders },
    { id: 'profile', label: 'Профиль', icon: User },
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
            onFinish={() => setActiveTab('plan')}
          />
        )}
        {activeTab === 'plan' && (
          <PlanScreen onSelectDate={handleStartWorkout} />
        )}
        {activeTab === 'progress' && <ProgressScreen />}
        {activeTab === 'program' && <ProgramEditorScreen />}
        {activeTab === 'profile' && <ProfileScreen />}
      </main>

      {/* Bottom Navigation Bar (Strict Brutalist Style, Large touch targets) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-black/95 backdrop-blur-md border-t-2 border-yellow-400 pb-safe">
        <div className="max-w-2xl mx-auto flex items-stretch justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-1 min-h-[52px] flex flex-col items-center justify-center py-1.5 px-0.5 rounded-none transition-colors border-t-2 -mt-[2px] ${
                  isActive
                    ? 'border-yellow-400 bg-neutral-950 text-yellow-400 font-black'
                    : 'border-transparent text-neutral-400 hover:text-white hover:bg-neutral-950'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5] text-yellow-400' : 'stroke-2'}`} />
                <span className="text-[10px] mt-1 font-mono uppercase tracking-wider font-bold truncate max-w-[56px]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
      {/* Google & Multi-user Authentication Modal */}
      <GoogleAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
};

export default App;
