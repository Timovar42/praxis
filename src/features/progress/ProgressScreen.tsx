import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store';
import { getLiftHistory } from '../../domain/workoutHelper';
import { weeklyVolume } from '../../domain/volume';
import type { Muscle } from '../../domain/types';
import { calculateSessionTonnage } from '../../domain/engine2/tonnage';
import { rebuildEstimates, calculateTrend } from '../../domain/engine2/estimate';
import { DEFAULT_FAMILIES } from '../../domain/engine2/families';
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

  // Rebuild Engine v2 estimates for all families
  const allEstimates = useMemo(() => {
    return rebuildEstimates(sessions, DEFAULT_FAMILIES, settings ?? {});
  }, [sessions, settings]);

  const availableLifts = useMemo(() => {
    const defaultList = [
      { id: 'all', label: 'Вся база' },
      { id: 'squat', label: 'Присед' },
      { id: 'bench', label: 'Жим лёжа' },
      { id: 'deadlift', label: 'Становая' },
      { id: 'incline', label: 'Жим в наклоне' },
      { id: 'biceps', label: 'Бицепс' },
      { id: 'row', label: 'Тяга к поясу' },
      { id: 'rdl', label: 'Румынская тяга' },
    ];
    for (const [fId, bins] of Object.entries(allEstimates)) {
      if (bins.all?.n > 0 && !defaultList.some((l) => l.id === fId)) {
        const famName = DEFAULT_FAMILIES[fId]?.name || fId;
        defaultList.push({ id: fId, label: famName });
      }
    }
    return defaultList;
  }, [allEstimates]);

  const selectedFamilyEst = useMemo(() => {
    if (selectedLift === 'all') return null;
    return allEstimates[selectedLift]?.all ?? null;
  }, [allEstimates, selectedLift]);

  const familyChartData = useMemo(() => {
    if (!selectedFamilyEst || !selectedFamilyEst.hist || selectedFamilyEst.hist.length === 0) {
      return [];
    }
    return selectedFamilyEst.hist.map((h) => ({
      date: format(parseISO(h.date), 'd MMM', { locale: ru }),
      fullDate: h.date,
      mu: Math.round(h.mu * 10) / 10,
      muUpper: Math.round((h.mu + h.sd) * 10) / 10,
      muLower: Math.round(Math.max(0, h.mu - h.sd) * 10) / 10,
      sd: Math.round(h.sd * 10) / 10,
    }));
  }, [selectedFamilyEst]);

  const trend = useMemo(() => {
    if (!selectedFamilyEst || selectedFamilyEst.n < 2) return null;
    return calculateTrend(selectedFamilyEst);
  }, [selectedFamilyEst]);

  const trendRate4w = useMemo(() => {
    if (!selectedFamilyEst || selectedFamilyEst.hist.length < 2) return null;
    const window = selectedFamilyEst.hist.slice(-8);
    if (window.length < 2) return null;
    const t0 = parseISO(window[0].date).getTime();
    let sumT = 0;
    let sumMu = 0;
    const pts = window.map((p) => {
      const tWeeks = (parseISO(p.date).getTime() - t0) / (7 * 86400 * 1000);
      sumT += tWeeks;
      sumMu += p.mu;
      return { t: tWeeks, mu: p.mu };
    });
    const meanT = sumT / pts.length;
    const meanMu = sumMu / pts.length;
    let numerator = 0;
    let denominator = 0;
    for (const pt of pts) {
      numerator += (pt.t - meanT) * (pt.mu - meanMu);
      denominator += (pt.t - meanT) ** 2;
    }
    if (denominator === 0) return 0;
    const slope = numerator / denominator; // kg / week
    const latestMu = window[window.length - 1].mu;
    if (latestMu <= 0) return 0;
    return (slope / latestMu) * 4 * 100; // % over 4 weeks
  }, [selectedFamilyEst]);

  // 1. e1RM history for squat, bench, deadlift (combined overview)
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

  // 2. Weekly Tonnage (Dumbbells x2 via calculateSessionTonnage)
  const weeklyTonnageData = useMemo(() => {
    const weeksMap: Record<string, { weekStart: string; tonnage: number; sets: number }> = {};

    for (const session of sessions) {
      const mon = format(startOfWeek(parseISO(session.date), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      if (!weeksMap[mon]) {
        weeksMap[mon] = { weekStart: mon, tonnage: 0, sets: 0 };
      }

      const sessionTonnage = calculateSessionTonnage(session, program ?? undefined);
      weeksMap[mon].tonnage += sessionTonnage;

      for (const entry of session.entries || []) {
        if (entry.skipped) continue;
        for (const set of entry.sets || []) {
          if (set.done && set.weight && set.reps) {
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
  }, [sessions, program]);

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
          {/* Lift / Family Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {availableLifts.map((lift) => (
              <button
                key={lift.id}
                onClick={() => setSelectedLift(lift.id)}
                className={`px-3 py-1.5 rounded-none text-xs font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-colors border cursor-pointer active:scale-95 ${
                  selectedLift === lift.id
                    ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.3)]'
                    : 'bg-black border-neutral-800 text-neutral-400 hover:text-white hover:border-yellow-400/50'
                }`}
              >
                {lift.label}
              </button>
            ))}
          </div>

          {/* Family Strength mu, Trend & Phase Badges */}
          {selectedLift !== 'all' && selectedFamilyEst && (
            <div className="bg-black border-2 border-yellow-400 rounded-none p-3.5 shadow-[0_0_12px_rgba(250,204,21,0.15)] space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest block">
                    Опорная сила семьи {DEFAULT_FAMILIES[selectedLift]?.name || selectedLift}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-mono font-black text-yellow-400">
                      {selectedFamilyEst.mu > 0 ? selectedFamilyEst.mu.toFixed(1) : '—'}{' '}
                      <span className="text-sm font-bold text-white">кг</span>
                    </span>
                    {selectedFamilyEst.mu > 0 && (
                      <span className="text-xs font-mono text-neutral-400">
                        ±{Math.sqrt(selectedFamilyEst.p).toFixed(1)} кг (1 SD)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {trend && (
                    <span
                      className={`text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-none border ${
                        trend === 'растёт'
                          ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.4)]'
                          : trend === 'падает'
                          ? 'bg-red-500/20 text-red-400 border-red-500/50'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-700'
                      }`}
                    >
                      {trend === 'растёт' && '▲ '}
                      {trend === 'падает' && '▼ '}
                      {trend === 'держится' && '■ '}
                      {trend}{' '}
                      {trendRate4w != null
                        ? `(${trendRate4w >= 0 ? '+' : ''}${trendRate4w.toFixed(1)}% / 4 нед)`
                        : ''}
                    </span>
                  )}

                  <span
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-none border ${
                      settings?.phase === 'bulk'
                        ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/50'
                        : settings?.phase === 'cut'
                        ? 'bg-neutral-900 text-neutral-300 border-neutral-700'
                        : 'bg-black text-neutral-400 border-neutral-800'
                    }`}
                  >
                    Фаза:{' '}
                    {settings?.phase === 'bulk'
                      ? 'Набор (+1%)'
                      : settings?.phase === 'cut'
                      ? 'Срезка (-2%)'
                      : 'Удержание'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-black border-2 border-yellow-400 rounded-none p-4 shadow-[0_0_15px_rgba(250,204,21,0.15)]">
            <div className="text-xs font-mono font-bold text-yellow-400 mb-3 flex items-center justify-between uppercase tracking-wider">
              <span>
                {selectedLift === 'all'
                  ? 'Динамика e1RM (кг)'
                  : `Сила семьи μ и коридор ±1 SD (${DEFAULT_FAMILIES[selectedLift]?.name || selectedLift})`}
              </span>
              <span className="text-neutral-500 lowercase">
                [{formula === 'epley' ? 'эпли' : 'бжицки'}]
              </span>
            </div>

            {selectedLift === 'all' ? (
              e1rmData.length === 0 ? (
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
                      <XAxis dataKey="date" stroke="#a3a3a3" fontSize={11} tickLine={false} />
                      <YAxis stroke="#a3a3a3" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
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
                      <Line
                        type="monotone"
                        dataKey="squat"
                        name="Присед"
                        stroke="#facc15"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#facc15', stroke: '#000' }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="bench"
                        name="Жим лёжа"
                        stroke="#ffffff"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#ffffff', stroke: '#000' }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="deadlift"
                        name="Становая"
                        stroke="#eab308"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#eab308', stroke: '#000' }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )
            ) : familyChartData.length === 0 ? (
              <div className="py-16 text-center text-neutral-500 text-xs font-mono">
                Пока нет сохранённых подходов для движения «{DEFAULT_FAMILIES[selectedLift]?.name || selectedLift}».
                <br />
                Заполните тренировку, чтобы увидеть график силы семьи и коридор ±1 SD.
              </div>
            ) : (
              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={familyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="date" stroke="#a3a3a3" fontSize={11} tickLine={false} />
                    <YAxis stroke="#a3a3a3" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#000000',
                        border: '2px solid #facc15',
                        borderRadius: '0px',
                        fontSize: '12px',
                        color: '#ffffff',
                        fontFamily: 'monospace',
                      }}
                      formatter={(val: any, name: any) => {
                        if (name === 'Сила μ') return [`${val} кг`, 'Сила μ'];
                        if (name === '+1 SD') return [`${val} кг`, '+1 SD (верх коридора)'];
                        if (name === '-1 SD') return [`${val} кг`, '-1 SD (низ коридора)'];
                        return [`${val} кг`, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', textTransform: 'uppercase' }} />
                    <Line
                      type="monotone"
                      dataKey="muUpper"
                      name="+1 SD"
                      stroke="#737373"
                      strokeDasharray="4 4"
                      dot={false}
                      strokeWidth={1.5}
                    />
                    <Line
                      type="monotone"
                      dataKey="mu"
                      name="Сила μ"
                      stroke="#facc15"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#facc15', stroke: '#000' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="muLower"
                      name="-1 SD"
                      stroke="#737373"
                      strokeDasharray="4 4"
                      dot={false}
                      strokeWidth={1.5}
                    />
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
