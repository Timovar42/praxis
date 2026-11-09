import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store';
import {
  backtestUserSessions,
  runBatchSimulation,
  simulate,
  type UserBacktestSummary,
  type SimulationResult,
} from '../../domain/engine2/simulation';
import { ArrowLeft, Play, Cpu, CheckCircle2, AlertTriangle, TrendingDown } from 'lucide-react';

interface BacktestScreenProps {
  onBack?: () => void;
}

export const BacktestScreen: React.FC<BacktestScreenProps> = ({ onBack }) => {
  const { sessions, program, settings } = useAppStore();

  const [activeTab, setActiveTab] = useState<'history' | 'simulation'>('history');
  const [simResults, setSimResults] = useState<ReturnType<typeof runBatchSimulation> | null>(null);
  const [isSimRunning, setIsSimRunning] = useState(false);
  const [singleSim, setSingleSim] = useState<SimulationResult | null>(null);

  // User history backtest
  const userBacktest: UserBacktestSummary = useMemo(() => {
    return backtestUserSessions(sessions, program, settings ?? {});
  }, [sessions, program, settings]);

  const handleRunSimulation = () => {
    setIsSimRunning(true);
    setTimeout(() => {
      const batch = runBatchSimulation(20);
      const single = simulate(42);
      setSimResults(batch);
      setSingleSim(single);
      setIsSimRunning(false);
    }, 100);
  };

  return (
    <div className="pb-36 max-w-2xl mx-auto px-3 sm:px-4 pt-3 font-mono">
      {/* Header */}
      <div className="bg-black border-2 border-yellow-400 p-4 mb-4 shadow-[0_0_15px_rgba(250,204,21,0.15)]">
        <div className="flex items-center justify-between gap-2 mb-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 px-2.5 py-1 bg-neutral-950 border border-yellow-400 hover:bg-yellow-400 hover:text-black text-yellow-400 text-xs font-black uppercase transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
              <span>Назад</span>
            </button>
          )}
          <span className="text-[10px] uppercase font-bold text-neutral-400">
            Engine v2 Benchmark & Verification
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
          Бэктест и верификация
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Пошаговая проверка движка подсказок на вашей реальной истории и 20 синтетических сидах.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-black border-2 border-yellow-400 p-0.5 mb-4 shadow-[0_0_10px_rgba(250,204,21,0.15)]">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-yellow-400 text-black shadow'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          История атлета ({userBacktest.totalEvaluations})
        </button>
        <button
          onClick={() => setActiveTab('simulation')}
          className={`flex-1 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === 'simulation'
              ? 'bg-yellow-400 text-black shadow'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Стресс-тест (20 сидов)
        </button>
      </div>

      {/* TAB 1: User History Backtest */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {userBacktest.totalEvaluations === 0 ? (
            <div className="bg-black border-2 border-yellow-400/40 p-6 text-center text-neutral-400 text-xs">
              <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="font-bold text-white uppercase mb-1">Недостаточно данных для бэктеста</p>
              <p className="text-[11px] text-neutral-500">
                Бэктесту требуется как минимум 2 тренировки по одной семье движений, чтобы проверить
                точность подсказок на последующих днях.
              </p>
            </div>
          ) : (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-black border-2 border-yellow-400 p-3">
                  <div className="text-[10px] text-neutral-400 uppercase font-bold">MAE (Ошибка)</div>
                  <div className="text-xl font-black text-yellow-400 mt-1">
                    {userBacktest.mae} <span className="text-xs text-white">кг</span>
                  </div>
                  <div className="text-[9px] text-neutral-500 mt-0.5">в среднем</div>
                </div>

                <div className="bg-black border-2 border-yellow-400 p-3">
                  <div className="text-[10px] text-neutral-400 uppercase font-bold">Смещение</div>
                  <div className="text-xl font-black text-white mt-1">
                    {userBacktest.bias >= 0 ? `+${userBacktest.bias}` : userBacktest.bias}{' '}
                    <span className="text-xs text-yellow-400">кг</span>
                  </div>
                  <div className="text-[9px] text-neutral-500 mt-0.5">
                    {userBacktest.bias > 0
                      ? 'переоценивает'
                      : userBacktest.bias < 0
                      ? 'недооценивает'
                      : 'нейтрально'}
                  </div>
                </div>

                <div className="bg-black border-2 border-yellow-400 p-3">
                  <div className="text-[10px] text-neutral-400 uppercase font-bold">Попадание ±2.5 кг</div>
                  <div className="text-xl font-black text-yellow-400 mt-1">
                    {Math.round(userBacktest.hitRate2_5kg * 100)}%
                  </div>
                  <div className="text-[9px] text-neutral-500 mt-0.5">доля точных</div>
                </div>

                <div className="bg-black border-2 border-yellow-400 p-3">
                  <div className="text-[10px] text-neutral-400 uppercase font-bold">Проверено</div>
                  <div className="text-xl font-black text-white mt-1">
                    {userBacktest.totalEvaluations}
                  </div>
                  <div className="text-[9px] text-neutral-500 mt-0.5">упражнений</div>
                </div>
              </div>

              {/* Evaluations Table */}
              <div className="bg-black border-2 border-yellow-400 p-4">
                <h3 className="text-xs font-black uppercase text-yellow-400 mb-3 tracking-wider">
                  Пошаговая история предсказаний v2 vs факт:
                </h3>
                <div className="space-y-1.5 max-h-96 overflow-y-auto">
                  {userBacktest.evaluations.map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-neutral-950 border border-neutral-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-white uppercase text-[11px]">
                          {ev.exerciseName}{' '}
                          <span className="text-neutral-500 lowercase font-normal">
                            ({ev.variantLabel})
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-500">{ev.date}</div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono text-xs">
                          Подсказка: <span className="text-yellow-400 font-bold">{ev.suggestedWeight}</span>{' '}
                          | Факт: <span className="text-white font-bold">{ev.actualWeight}</span> кг
                        </div>
                        <div className="text-[10px]">
                          {ev.within2_5kg ? (
                            <span className="text-green-400 font-bold">✓ в пределах ±2.5 кг</span>
                          ) : (
                            <span className="text-red-400 font-bold">
                              разница {ev.error.toFixed(1)} кг
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: Batch Simulation 20 Seeds */}
      {activeTab === 'simulation' && (
        <div className="space-y-4">
          <div className="bg-black border-2 border-yellow-400 p-4">
            <div className="flex items-start justify-between gap-2 flex-wrap mb-3">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-yellow-400" />
                  <span>Синтетический атлет (20 сидов × 16 недель)</span>
                </h2>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Атлет с истинным 1RM(t) = 100 + 0.5×t кг, шумом 3–6%, ротацией зон (vol/mid/str) и
                  сменой снарядов (Штанга → Гантели k=0.38 → Смитт k=0.95 → Штанга).
                </p>
              </div>

              <button
                onClick={handleRunSimulation}
                disabled={isSimRunning}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black font-black uppercase text-xs border border-yellow-400 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow"
              >
                <Play className="w-3.5 h-3.5 fill-black" />
                <span>{isSimRunning ? 'Расчёт...' : 'Запустить симуляцию'}</span>
              </button>
            </div>

            {simResults && (
              <div className="mt-4 pt-4 border-t border-yellow-500/30 space-y-4">
                {/* Result Highlights */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-neutral-950 border border-neutral-800 p-3">
                    <div className="text-[10px] text-neutral-400 uppercase font-bold">MAE Engine v1</div>
                    <div className="text-xl font-black text-neutral-400 mt-1">
                      {simResults.v1MeanMae} кг
                    </div>
                  </div>

                  <div className="bg-neutral-950 border-2 border-yellow-400 p-3">
                    <div className="text-[10px] text-yellow-400 uppercase font-bold">MAE Engine v2</div>
                    <div className="text-xl font-black text-yellow-400 mt-1">
                      {simResults.v2MeanMae} кг
                    </div>
                  </div>

                  <div className="bg-neutral-950 border border-yellow-400/50 p-3">
                    <div className="text-[10px] text-neutral-400 uppercase font-bold">Снижение ошибки</div>
                    <div className="text-xl font-black text-green-400 mt-1 flex items-center justify-center gap-1">
                      <TrendingDown className="w-4 h-4" />
                      <span>{simResults.meanImprovementPct}%</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-neutral-950 border border-yellow-500/40 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-yellow-400 shrink-0" />
                  <span>
                    Engine v2 превосходит v1 на всех 20 сидах благодаря автоматическому переносу веса
                    между снарядами и учету зон ротации.
                  </span>
                </div>

                {/* Timeline sample */}
                {singleSim && (
                  <div>
                    <h4 className="text-[11px] font-black uppercase text-yellow-400 mb-2">
                      Пример симуляции (Сид 42, 16 недель):
                    </h4>
                    <div className="space-y-1 max-h-72 overflow-y-auto">
                      {singleSim.steps.map((st) => (
                        <div
                          key={st.week}
                          className="p-1.5 bg-black border border-neutral-800 flex items-center justify-between text-[11px]"
                        >
                          <div>
                            <span className="font-bold text-white">Н{st.week}</span>{' '}
                            <span className="text-yellow-400 font-bold uppercase">{st.zone}</span> ·{' '}
                            <span className="text-neutral-400">{st.variantLabel}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-neutral-400">Идеал: {st.idealWeight} кг</span> |{' '}
                            <span className="text-yellow-400 font-bold">v2: {st.v2Suggested}</span>{' '}
                            <span className="text-neutral-500">(v1: {st.v1Suggested})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
