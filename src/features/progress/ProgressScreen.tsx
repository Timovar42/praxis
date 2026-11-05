import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store';
import { getLiftHistory } from '../../domain/workoutHelper';
import { weeklyVolume } from '../../domain/volume';
import type { Muscle } from '../../domain/types';
import { format, parseISO, startOfWeek, subWeeks } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { TrendingUp, BarChart3, Layers } from 'lucide-react';

const MUSCLE_NAMES: Record<Muscle, string> = {
  quads: 'Квадрицепсы',
  hams: 'Бицепс бедра',
  glutes: 'Ягодицы',
  chest: 'Грудь',
  back: 'Спина',
  traps: 'Трапеции',
  fdelts: 'Передняя дельта',
  sdelts: 'Средняя дельта',
  rdelts: 'Задняя дельта',
  biceps: 'Бицепс',
  triceps: 'Трицепс',
  calves: 'Икры',
  abs: 'Пресс',
};

export const ProgressScreen: React.FC = () => {
  const { program, sessions, settings } = useAppStore();
  const [selectedLift, setSelectedLift] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'e1rm' | 'tonnage' | 'volume'>('e1rm');

  const formula = settings?.formula ?? 'epley';

  // 1. e1RM history for squat, bench, deadlift
  const e1rmData = useMemo(() => {
    if (!program) return [];

    const squatHist = getLiftHistory(sessions, 'squat', program, formula);
    const benchHist = getLiftHistory(sessions, 'bench', program, formula);
    const deadliftHist = getLiftHistory(sessions, 'deadlift', program, formula);

    const allDates = Array.from(
      new Set([
        ...squatHist.map((h) => h.date),
        ...benchHist.map((h) => h.date),
        ...deadliftHist.map((h) => h.date),
      ])
    ).sort();

    return allDates.map((d) => {
      const sq = squatHist.find((h) => h.date === d)?.e1rm;
      const bp = benchHist.find((h) => h.date === d)?.e1rm;
      const dl = deadliftHist.find((h) => h.date === d)?.e1rm;

      return {
        date: format(parseISO(d), 'd MMM', { locale: ru }),
        fullDate: d,
        squat: sq ? Math.round(sq * 10) / 10 : undefined,
        bench: bp ? Math.round(bp * 10) / 10 : undefined,
        deadlift: dl ? Math.round(dl * 10) / 10 : undefined,
      };
    });
  }, [program, sessions, formula]);

  // 2. Weekly Tonnage
  const weeklyTonnageData = useMemo(() => {
    const weeksMap: Record<string, { weekStart: string; tonnage: number; sets: number }> = {};

    for (const session of sessions) {
      const mon = format(startOfWeek(parseISO(session.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      if (!weeksMap[mon]) {
        weeksMap[mon] = { weekStart: mon, tonnage: 0, sets: 0 };
      }

      for (const entry of session.entries) {
        if (entry.skipped) continue;
        for (const set of entry.sets) {
          if (set.done && set.weight && set.reps) {
            weeksMap[mon].tonnage += set.weight * set.reps;
            weeksMap[mon].sets++;
          }
        }
      }
    }

    return Object.values(weeksMap)
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
      .map((w) => ({
        label: format(parseISO(w.weekStart), 'd MMM', { locale: ru }),
        tonnage: Math.round(w.tonnage),
        sets: w.sets,
      }));
  }, [sessions]);

  // 3. Current week volume by muscles
  const currentWeekVolume = useMemo(() => {
    if (!program) return null;
    const now = new Date();
    const mon = startOfWeek(now, { weekStartsOn: 1 });
    return weeklyVolume(sessions, program, mon);
  }, [program, sessions]);

  // 4. Previous week volume for comparison
  const prevWeekVolume = useMemo(() => {
    if (!program) return null;
    const prevMon = subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1);
    return weeklyVolume(sessions, program, prevMon);
  }, [program, sessions]);

  if (!program) {
    return <div className="p-8 text-center text-neutral-400 font-mono">Загрузка прогресса...</div>;
  }

  return (
    <div className="pb-32 max-w-2xl mx-auto px-3 sm:px-4 pt-3">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
          Прогресс и аналитика
        </h1>
        <p className="text-xs font-mono text-neutral-400 mt-0.5">
          Динамика e1RM, объёма и тоннажа
        </p>
      </div>

      {/* Navigation Tabs (Strict Rectangular Segmented Control) */}
      <div className="flex bg-black border-2 border-yellow-400 p-0.5 rounded-none mb-4 shadow-[0_0_10px_rgba(250,204,21,0.15)]">
        <button
          onClick={() => setActiveTab('e1rm')}
          className={`flex-1 py-2 rounded-none text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'e1rm'
              ? 'bg-yellow-400 text-black shadow'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>e1RM</span>
        </button>

        <button
          onClick={() => setActiveTab('tonnage')}
          className={`flex-1 py-2 rounded-none text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'tonnage'
              ? 'bg-yellow-400 text-black shadow'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Тоннаж</span>
        </button>

        <button
          onClick={() => setActiveTab('volume')}
          className={`flex-1 py-2 rounded-none text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'volume'
              ? 'bg-yellow-400 text-black shadow'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Мышцы</span>
        </button>
      </div>

      {/* Tab 1: e1RM Chart */}
      {activeTab === 'e1rm' && (
        <div className="space-y-4">
          {/* Lift Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'Вся база' },
              { id: 'squat', label: 'Присед' },
              { id: 'bench', label: 'Жим лёжа' },
              { id: 'deadlift', label: 'Становая' },
            ].map((lift) => (
              <button
                key={lift.id}
                onClick={() => setSelectedLift(lift.id)}
                className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-colors border ${
                  selectedLift === lift.id
                    ? 'bg-yellow-400 text-black border-yellow-400'
                    : 'bg-black border-neutral-800 text-neutral-400 hover:text-white hover:border-yellow-400/50'
                }`}
              >
                {lift.label}
              </button>
            ))}
          </div>

          <div className="bg-black border-2 border-yellow-400 rounded-none p-4 shadow-[0_0_15px_rgba(250,204,21,0.15)]">
            <div className="text-xs font-mono font-bold text-yellow-400 mb-3 flex items-center justify-between uppercase tracking-wider">
              <span>Динамика e1RM (кг)</span>
              <span className="text-neutral-500 lowercase">
                [{formula === 'epley' ? 'эпли' : 'бжицки'}]
              </span>
            </div>

            {e1rmData.length === 0 ? (
              <div className="py-16 text-center text-neutral-500 text-xs font-mono">
                Пока нет сохранённых рабочих подходов по базовым движениям.
                <br />
                Заполните тренировку, чтобы увидеть график.
              </div>
            ) : (
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={e1rmData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis
                      dataKey="date"
                      stroke="#a3a3a3"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#a3a3a3"
                      fontSize={11}
                      tickLine={false}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#000000',
                        border: '2px solid #facc15',
                        borderRadius: '0px',
                        fontSize: '12px',
                        color: '#ffffff',
                        fontFamily: 'monospace',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', textTransform: 'uppercase' }} />
                    {(selectedLift === 'all' || selectedLift === 'squat') && (
                      <Line
                        type="monotone"
                        dataKey="squat"
                        name="Присед"
                        stroke="#facc15"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#facc15', stroke: '#000' }}
                        connectNulls
                      />
                    )}
                    {(selectedLift === 'all' || selectedLift === 'bench') && (
                      <Line
                        type="monotone"
                        dataKey="bench"
                        name="Жим лёжа"
                        stroke="#ffffff"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#ffffff', stroke: '#000' }}
                        connectNulls
                      />
                    )}
                    {(selectedLift === 'all' || selectedLift === 'deadlift') && (
                      <Line
                        type="monotone"
                        dataKey="deadlift"
                        name="Становая"
                        stroke="#eab308"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#eab308', stroke: '#000' }}
                        connectNulls
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Tonnage Chart */}
      {activeTab === 'tonnage' && (
        <div className="bg-black border-2 border-yellow-400 rounded-none p-4 shadow-[0_0_15px_rgba(250,204,21,0.15)]">
          <div className="text-xs font-mono font-bold text-yellow-400 mb-3 uppercase tracking-wider">
            Тоннаж по неделям (кг)
          </div>

          {weeklyTonnageData.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 text-xs font-mono">
              Нет данных о выполненных подходах.
            </div>
          ) : (
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={weeklyTonnageData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="label" stroke="#a3a3a3" fontSize={11} tickLine={false} />
                  <YAxis stroke="#a3a3a3" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#000000',
                      border: '2px solid #facc15',
                      borderRadius: '0px',
                      fontSize: '12px',
                      color: '#ffffff',
                      fontFamily: 'monospace',
                    }}
                    formatter={(val: any) => [`${val.toLocaleString('ru')} кг`, 'Тоннаж']}
                  />
                  <Bar dataKey="tonnage" fill="#facc15" radius={0} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Muscle Volume */}
      {activeTab === 'volume' && (
        <div className="space-y-4">
          <div className="bg-black border-2 border-yellow-400 rounded-none p-4 shadow-[0_0_15px_rgba(250,204,21,0.15)]">
            <div className="flex items-center justify-between mb-4 border-b border-yellow-500/20 pb-2">
              <div>
                <h3 className="text-sm font-black text-white uppercase font-mono tracking-wider">
                  Текущая неделя
                </h3>
                <span className="text-[10px] font-mono text-neutral-400">
                  Рабочие подходы: прямые / суммарные
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {(Object.keys(MUSCLE_NAMES) as Muscle[]).map((m) => {
                const direct = currentWeekVolume?.direct[m] ?? 0;
                const total = currentWeekVolume?.total[m] ?? 0;
                const prevDirect = prevWeekVolume?.direct[m] ?? 0;

                const maxScale = 15;
                const directPct = Math.min(100, Math.round((direct / maxScale) * 100));
                const totalPct = Math.min(100, Math.round((total / maxScale) * 100));

                return (
                  <div key={m} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-white uppercase text-[11px] tracking-wide">
                        {MUSCLE_NAMES[m]}
                      </span>
                      <div>
                        <span className="text-yellow-400 font-black">{direct}</span>
                        <span className="text-neutral-400">
                          {' '}
                          (всего {Math.round(total * 10) / 10})
                        </span>
                        {prevDirect > 0 && (
                          <span className="text-[10px] text-neutral-500 ml-1.5">
                            пред: {prevDirect}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Strict Brutalist Bar */}
                    <div className="w-full bg-neutral-900 h-2 rounded-none border border-neutral-800 overflow-hidden relative">
                      <div
                        className="bg-yellow-400/30 h-full absolute left-0 top-0 transition-all duration-300"
                        style={{ width: `${totalPct}%` }}
                      />
                      <div
                        className="bg-yellow-400 h-full absolute left-0 top-0 transition-all duration-300"
                        style={{ width: `${directPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
