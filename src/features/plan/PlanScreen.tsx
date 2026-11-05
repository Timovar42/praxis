import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store';
import { ZoneBadge } from '../../components/ZoneBadge';
import { dateToRotation } from '../../domain/rotation';
import { getCurrentLiftE1RM } from '../../domain/workoutHelper';
import { suggest } from '../../domain/progression';
import {
  format,
  parseISO,
  addWeeks,
  startOfWeek,
  addDays,
  isBefore,
  isToday,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface PlanScreenProps {
  onSelectDate: (dateStr: string) => void;
}

export const PlanScreen: React.FC<PlanScreenProps> = ({ onSelectDate }) => {
  const { program, sessions, settings } = useAppStore();

  const [weekOffset, setWeekOffset] = useState<number>(0);

  const currentWeekMonday = useMemo(() => {
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  }, []);

  const displayedWeekMonday = useMemo(() => {
    return addWeeks(currentWeekMonday, weekOffset);
  }, [currentWeekMonday, weekOffset]);

  const displayedWeekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(displayedWeekMonday, i));
  }, [displayedWeekMonday]);

  const weekRotation = useMemo(() => {
    if (!program) return null;
    const mondayStr = format(displayedWeekMonday, 'yyyy-MM-dd');
    return dateToRotation(
      mondayStr,
      program.cycleStart,
      program.cycleWeeks,
      program.rotation
    );
  }, [program, displayedWeekMonday]);

  // Compute reference e1RM for base lifts to show upcoming suggestions
  const baseLiftsE1rm = useMemo(() => {
    if (!program || !settings) return {};
    const baseKeys = ['squat', 'bench', 'deadlift'];
    const result: Record<string, number> = {};
    for (const key of baseKeys) {
      const { value } = getCurrentLiftE1RM(sessions, key, program, settings);
      if (value > 0) result[key] = value;
    }
    return result;
  }, [program, sessions, settings]);

  if (!program || !settings) {
    return <div className="p-8 text-center text-neutral-400 font-mono">Загрузка плана...</div>;
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="pb-32 max-w-2xl mx-auto px-3 sm:px-4 pt-3">
      {/* Week Navigator */}
      <div className="bg-black border-2 border-yellow-400 rounded-none p-4 mb-4 shadow-[0_0_15px_rgba(250,204,21,0.15)]">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setWeekOffset((prev) => prev - 1)}
            className="p-2 text-yellow-400 hover:text-white rounded-none hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-colors"
            title="Предыдущая неделя"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="text-center">
            <div className="text-xs font-mono font-black text-yellow-400 uppercase tracking-widest">
              {weekRotation && weekRotation.cycle > 0
                ? `ЦИКЛ ${weekRotation.cycle} · НЕДЕЛЯ ${weekRotation.week} ИЗ ${program.cycleWeeks}`
                : 'ВНЕ ЦИКЛА'}
            </div>
            <div className="text-sm sm:text-base font-black text-white uppercase font-mono mt-0.5">
              {format(displayedWeekMonday, 'd MMMM', { locale: ru })} —{' '}
              {format(addDays(displayedWeekMonday, 6), 'd MMMM yyyy', { locale: ru })}
            </div>
          </div>

          <button
            onClick={() => setWeekOffset((prev) => prev + 1)}
            className="p-2 text-yellow-400 hover:text-white rounded-none hover:bg-neutral-900 border border-transparent hover:border-neutral-800 transition-colors"
            title="Следующая неделя"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {weekOffset !== 0 && (
          <div className="text-center mt-2 pt-2 border-t border-yellow-500/20">
            <button
              onClick={() => setWeekOffset(0)}
              className="text-[11px] font-mono font-bold text-yellow-400 hover:text-yellow-300 uppercase tracking-wider underline"
            >
              Вернуться к текущей неделе
            </button>
          </div>
        )}
      </div>

      {/* Days List */}
      <div className="space-y-3">
        {displayedWeekDays.map((dayDate) => {
          const dateStr = format(dayDate, 'yyyy-MM-dd');
          const dayRotation = dateToRotation(
            dateStr,
            program.cycleStart,
            program.cycleWeeks,
            program.rotation
          );

          const dayKey = dayRotation.day;
          const zone = dayRotation.zone;
          const isRestDay = !dayKey || !zone;

          const session = sessions.find((s) => s.date === dateStr);
          const dayTitle = dayKey ? program.days[dayKey]?.title : 'День отдыха';

          const isDateInPast = isBefore(dayDate, parseISO(todayStr)) && !isToday(dayDate);
          const isDateToday = isToday(dayDate);

          let status: 'done' | 'missed' | 'today' | 'upcoming' | 'rest' = 'upcoming';
          let doneSetsCount = 0;
          let sessionTonnage = 0;

          if (session) {
            for (const entry of session.entries) {
              if (entry.skipped) continue;
              for (const set of entry.sets) {
                if (set.type === 'work' && set.done) {
                  doneSetsCount++;
                  if (set.weight && set.reps) {
                    sessionTonnage += set.weight * set.reps;
                  }
                }
              }
            }
          }

          if (isRestDay) {
            status = 'rest';
          } else if (session && doneSetsCount > 0) {
            status = 'done';
          } else if (isDateToday) {
            status = 'today';
          } else if (isDateInPast) {
            status = 'missed';
          } else {
            status = 'upcoming';
          }

          // Generate preview of base lift suggestions for upcoming training days
          const baseSuggestions: Array<{ name: string; suggestion: string }> = [];
          if (!isRestDay && (status === 'upcoming' || status === 'today') && zone) {
            const slotsForDay = program.slots.filter((s) => s.day === dayKey && s.kind === 'main');
            for (const slot of slotsForDay) {
              const e1rm = baseLiftsE1rm[slot.lift];
              if (e1rm && e1rm > 0) {
                const rx = slot.rx[zone];
                const sug = suggest(slot, zone, 0, rx, e1rm, settings);
                if (sug) {
                  baseSuggestions.push({
                    name: slot.name,
                    suggestion: `~${sug.weight} кг (${sug.sets}×${Array.isArray(sug.reps) ? sug.reps[1] : sug.reps})`,
                  });
                }
              }
            }
          }

          return (
            <div
              key={dateStr}
              onClick={() => {
                if (!isRestDay) onSelectDate(dateStr);
              }}
              className={`rounded-none border-2 p-3.5 transition-all ${
                isRestDay
                  ? 'bg-black border-neutral-900 opacity-40'
                  : 'bg-black cursor-pointer shadow ' +
                    (isDateToday
                      ? 'border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.25)]'
                      : 'border-yellow-500/40 hover:border-yellow-400')
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white uppercase font-mono">
                      {format(dayDate, 'EEEE, d MMM', { locale: ru })}
                    </span>
                    {isDateToday && (
                      <span className="text-[9px] font-mono font-black uppercase tracking-wider px-1.5 py-0.2 bg-yellow-400 text-black">
                        СЕГОДНЯ
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-300 mt-0.5 font-medium">
                    {dayTitle}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {zone && <ZoneBadge zone={zone} size="sm" />}

                  {status === 'done' && (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-none bg-black text-yellow-400 border border-yellow-400">
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                      <span>{Math.round(sessionTonnage)} КГ</span>
                    </span>
                  )}
                  {status === 'missed' && (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-none bg-black text-neutral-400 border border-neutral-700">
                      <AlertCircle className="w-3 h-3" />
                      <span>ПРОПУСК</span>
                    </span>
                  )}
                  {status === 'upcoming' && (
                    <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-none bg-neutral-950 text-neutral-400 border border-neutral-800">
                      <Clock className="w-3 h-3" />
                      <span>В РАСПИСАНИИ</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Summary if done */}
              {status === 'done' && (
                <div className="mt-1 text-xs text-neutral-400 font-mono flex items-center gap-3">
                  <span>Выполнено: {doneSetsCount} подходов</span>
                  {session?.badDay && (
                    <span className="text-yellow-400 font-bold">· Плохой день</span>
                  )}
                </div>
              )}

              {/* Base lift suggestions */}
              {baseSuggestions.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-yellow-500/20">
                  <div className="text-[10px] font-mono font-bold text-yellow-400 flex items-center gap-1 mb-1 uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-yellow-400" />
                    <span>Ориентир по базе:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {baseSuggestions.map((bs, i) => (
                      <span
                        key={i}
                        className="text-[11px] bg-neutral-950 border border-neutral-800 px-2 py-0.5 text-neutral-300 font-mono rounded-none"
                      >
                        <strong className="text-white">{bs.name}:</strong>{' '}
                        <span className="text-yellow-400 font-bold">{bs.suggestion}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!isRestDay && (
                <div className="mt-2.5 flex items-center justify-end text-xs font-mono font-bold text-yellow-400 gap-1 uppercase tracking-wider">
                  <span>
                    {status === 'done'
                      ? 'Просмотр записи'
                      : status === 'today'
                      ? 'Открыть тренировку'
                      : 'Открыть'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
