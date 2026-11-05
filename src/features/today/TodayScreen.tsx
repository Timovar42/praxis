import React, { useMemo } from 'react';
import { useAppStore } from '../../store';
import { ZoneBadge } from '../../components/ZoneBadge';
import { dateToRotation, getTrainingDates } from '../../domain/rotation';
import { checkFatigueBanner } from '../../domain/workoutHelper';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Flame,
  ArrowRight,
  Dumbbell,
  AlertTriangle,
  Moon,
  Sparkles,
} from 'lucide-react';

interface TodayScreenProps {
  onStartWorkout: (dateStr: string) => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({ onStartWorkout }) => {
  const { program, sessions, settings } = useAppStore();

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const todayFormatted = useMemo(
    () => format(new Date(), 'EEEE, d MMMM yyyy', { locale: ru }),
    []
  );

  const rotation = useMemo(() => {
    if (!program) return null;
    return dateToRotation(
      todayStr,
      program.cycleStart,
      program.cycleWeeks,
      program.rotation
    );
  }, [program, todayStr]);

  const existingSession = useMemo(() => {
    return sessions.find((s) => s.date === todayStr);
  }, [sessions, todayStr]);

  // Fatigue banner check
  const fatigue = useMemo(() => {
    if (!program || !settings) return { show: false };
    return checkFatigueBanner(sessions, program, settings);
  }, [sessions, program, settings]);

  // Next upcoming workout if today is a rest day
  const nextTraining = useMemo(() => {
    if (!program) return null;
    const upcoming = getTrainingDates(program, todayStr, 7);
    return upcoming.find((d) => d.date !== todayStr) ?? null;
  }, [program, todayStr]);

  if (!program) {
    return <div className="p-8 text-center text-neutral-400 font-mono">Загрузка программы...</div>;
  }

  const isTrainingDay = rotation?.day != null && rotation?.zone != null;
  const dayKey = rotation?.day;
  const zone = rotation?.zone;
  const dayInfo = dayKey ? program.days[dayKey] : null;
  const todaySlots = dayKey ? program.slots.filter((s) => s.day === dayKey) : [];

  // Completed sets count
  let totalSetsCount = 0;
  let doneSetsCount = 0;
  if (existingSession) {
    for (const e of existingSession.entries) {
      if (e.skipped) continue;
      for (const s of e.sets) {
        if (s.type === 'work') {
          totalSetsCount++;
          if (s.done) doneSetsCount++;
        }
      }
    }
  }

  return (
    <div className="pb-28 max-w-xl mx-auto px-3 sm:px-4 pt-4">
      {/* Fatigue Warning Banner */}
      {fatigue.show && (
        <div className="mb-4 bg-black border-2 border-yellow-400 rounded-none p-3.5 text-yellow-400 flex items-start gap-3 shadow-[0_0_12px_rgba(250,204,21,0.2)]">
          <AlertTriangle className="w-5 h-5 shrink-0 text-yellow-400 mt-0.5" />
          <div className="text-xs">
            <div className="font-black uppercase tracking-wider text-white mb-0.5">
              Внимание: возможна усталость
            </div>
            <p className="text-neutral-300 font-mono text-[11px]">{fatigue.reason}</p>
          </div>
        </div>
      )}

      {/* Header Info */}
      <div className="mb-4 flex items-end justify-between border-b border-yellow-500/20 pb-3">
        <div>
          <span className="text-[10px] font-mono font-bold text-yellow-400 uppercase tracking-widest block">
            СЕГОДНЯ
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white capitalize tracking-tight mt-0.5">
            {todayFormatted}
          </h1>
        </div>
        {rotation && rotation.week > 0 && (
          <div className="text-right">
            <span className="text-xs font-mono text-neutral-300 font-bold block">
              Ц{rotation.cycle} · Н{rotation.week}
            </span>
            {zone && <ZoneBadge zone={zone} size="md" className="mt-1" />}
          </div>
        )}
      </div>

      {isTrainingDay && dayInfo && zone ? (
        /* Training Day View */
        <div className="space-y-4">
          {/* Main Card */}
          <div className="bg-black border-2 border-yellow-400 rounded-none p-5 shadow-[0_0_15px_rgba(250,204,21,0.15)] relative">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-mono font-black text-yellow-400 uppercase tracking-widest">
                ПЛАН ДНЯ
              </span>
              <ZoneBadge zone={zone} size="lg" />
            </div>

            <h2 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">
              {dayInfo.title}
            </h2>

            {/* Progress if started */}
            {existingSession && totalSetsCount > 0 && (
              <div className="mb-4 bg-neutral-950 p-3 rounded-none border border-neutral-800">
                <div className="flex items-center justify-between text-xs font-mono text-neutral-300 mb-2">
                  <span className="uppercase text-[11px] tracking-wider">Прогресс подходов</span>
                  <span className="font-bold text-yellow-400">
                    {doneSetsCount} / {totalSetsCount} ({Math.round((doneSetsCount / totalSetsCount) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-neutral-900 h-2.5 rounded-none border border-neutral-800 overflow-hidden">
                  <div
                    className="bg-yellow-400 h-full transition-all duration-300"
                    style={{
                      width: `${Math.round((doneSetsCount / totalSetsCount) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Cardio block */}
            {dayInfo.cardio && (
              <div className="flex items-center justify-between gap-2 text-xs text-neutral-200 bg-neutral-950 px-3.5 py-2.5 rounded-none mb-4 border border-yellow-500/30">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-yellow-400 shrink-0" />
                  <span className="font-mono">
                    Кардио: <strong className="text-white font-bold">{dayInfo.cardio.minutes} мин</strong> ({dayInfo.cardio.kind})
                  </span>
                </div>
                {existingSession?.cardioDone && (
                  <span className="text-[10px] font-mono text-yellow-400 bg-black px-2 py-0.5 border border-yellow-400 font-black uppercase">
                    Сделано ✓
                  </span>
                )}
              </div>
            )}

            {/* Big Action Button */}
            <button
              onClick={() => onStartWorkout(todayStr)}
              className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-black text-sm uppercase tracking-widest rounded-none border-2 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.4)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Dumbbell className="w-5 h-5 stroke-[2.5]" />
              <span>
                {existingSession && doneSetsCount > 0
                  ? 'Продолжить тренировку'
                  : 'Начать тренировку'}
              </span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Exercises Preview List */}
          <div className="bg-black border border-yellow-500/40 rounded-none p-4 shadow">
            <h3 className="text-xs font-black uppercase tracking-wider text-yellow-400 mb-3 flex items-center gap-2 font-mono">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>Упражнения на сегодня [{todaySlots.length}]</span>
            </h3>

            <div className="divide-y divide-neutral-900">
              {todaySlots.map((slot, index) => {
                const rx = slot.rx[zone];
                const opt = rx.opts[0];
                return (
                  <div key={slot.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-none bg-neutral-900 border border-neutral-800 text-yellow-400 flex items-center justify-center text-xs font-mono font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{slot.name}</span>
                          {slot.kind === 'main' && (
                            <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 bg-black text-yellow-400 border border-yellow-400">
                              База
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-neutral-400 font-mono mt-0.5">
                          {opt[0]}×{Array.isArray(opt[1]) ? `${opt[1][0]}-${opt[1][1]}` : opt[1]}
                          {rx.rpe && ` · RPE ${rx.rpe[0]}–${rx.rpe[1]}`}
                          {rx.cap != null && ` · <${Math.round(rx.cap * 100)}%`}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Rest Day View */
        <div className="space-y-4">
          <div className="bg-black border-2 border-yellow-400 rounded-none p-6 text-center shadow-[0_0_15px_rgba(250,204,21,0.15)]">
            <div className="w-14 h-14 bg-black text-yellow-400 border-2 border-yellow-400 rounded-none flex items-center justify-center mx-auto mb-4 shadow-[0_0_10px_rgba(250,204,21,0.2)]">
              <Moon className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">День отдыха</h2>
            <p className="text-xs sm:text-sm text-neutral-400 max-w-sm mx-auto mb-6">
              Восстановление мышц и ЦНС. Спите не менее 8 часов, держите баланс воды и белка.
            </p>

            {nextTraining && (
              <div className="bg-neutral-950 border border-yellow-500/40 rounded-none p-4 text-left mb-4">
                <span className="text-[10px] font-mono font-bold text-yellow-400 uppercase tracking-widest block mb-1">
                  Следующая тренировка
                </span>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-black text-white text-base capitalize">
                    {format(parseISO(nextTraining.date), 'EEEE, d MMMM', { locale: ru })}
                  </span>
                  <ZoneBadge zone={nextTraining.zone} size="sm" />
                </div>
                <div className="text-xs text-neutral-400 mb-3 font-mono">
                  {program.days[nextTraining.day]?.title}
                </div>
                <button
                  onClick={() => onStartWorkout(nextTraining.date)}
                  className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-yellow-400 border border-yellow-400 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Открыть эту тренировку</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
