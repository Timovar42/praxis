import React, { useEffect, useState } from 'react';
import { useAppStore } from './store';
import { TodayScreen } from './features/today/TodayScreen';
import { WorkoutScreen } from './features/workout/WorkoutScreen';
import { PlanScreen } from './features/plan/PlanScreen';
import { ProgressScreen } from './features/progress/ProgressScreen';
import { ProgramEditorScreen } from './features/program-editor/ProgramEditorScreen';
import { SettingsScreen } from './features/settings/SettingsScreen';
import { format } from 'date-fns';
import {
  CalendarDays,
  Dumbbell,
  Calendar,
  TrendingUp,
  Sliders,
  Settings as SettingsIcon,
} from 'lucide-react';

type Tab = 'today' | 'workout' | 'plan' | 'progress' | 'program' | 'settings';

export const App: React.FC = () => {
  const { init, initialized } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('today');
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
          Инициализация WaveLog...
        </p>
      </div>
    );
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
    { id: 'settings', label: 'Опции', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col selection:bg-yellow-400 selection:text-black">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b-2 border-yellow-400 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-none bg-yellow-400 text-black flex items-center justify-center font-black shadow-[0_0_10px_rgba(250,204,21,0.4)]">
              <Dumbbell className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-black text-lg tracking-wider uppercase font-mono text-white">
                WAVELOG
              </span>
              <span className="text-[10px] text-yellow-400 font-mono font-bold uppercase tracking-widest border border-yellow-400/40 px-1 py-0.2">
                PRO 1.0
              </span>
            </div>
          </div>
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
        {activeTab === 'settings' && <SettingsScreen />}
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
    </div>
  );
};

export default App;
