import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store';
import { dexieRepo } from '../../repo/dexieRepo';
import { INITIAL_FAMILIES } from '../../data/families';
import type { Family, KPrior } from '../../domain/engine2/types';
import type { Estimate } from '../../domain/types';
import {
  SlidersHorizontal,
  RotateCcw,
  Check,
  TrendingUp,
  Activity,
  ArrowLeft,
} from 'lucide-react';

interface CalibrationScreenProps {
  onClose?: () => void;
}

export const CalibrationScreen: React.FC<CalibrationScreenProps> = ({ onClose }) => {
  const { currentUser, sessions } = useAppStore();
  const userId = currentUser?.id || 'user_default';

  const [families, setFamilies] = useState<Record<string, Family>>({});
  const [estimates, setEstimates] = useState<Record<string, Estimate>>({});
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('bench');
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const famList = await (dexieRepo.getFamilies ? dexieRepo.getFamilies(userId) : Object.values(INITIAL_FAMILIES));
      const famMap: Record<string, Family> = {};
      for (const f of famList) {
        famMap[f.id] = f;
      }
      setFamilies(famMap);

      const estList = await (dexieRepo.getEstimates ? dexieRepo.getEstimates(userId) : []);
      const estMap: Record<string, Estimate> = {};
      for (const e of estList) {
        if (e.bin === 'all') {
          estMap[e.familyId] = e;
        }
      }
      setEstimates(estMap);
    }
    loadData();
  }, [userId, sessions]);

  const handleUpdateK = async (familyId: string, variantId: string, newValue: number) => {
    const fam = families[familyId];
    if (!fam) return;

    const currentK = fam.k[variantId] || { value: 1.0, conf: 'med', n: 1 };
    const updatedK: KPrior = {
      ...currentK,
      value: Math.max(0.05, Math.min(10.0, newValue)),
    };

    const updatedFam: Family = {
      ...fam,
      k: {
        ...fam.k,
        [variantId]: updatedK,
      },
    };

    setFamilies((prev) => ({ ...prev, [familyId]: updatedFam }));
    if (dexieRepo.saveFamily) {
      await dexieRepo.saveFamily(updatedFam, userId);
    }

    setSaveSuccess(`${familyId}_${variantId}`);
    setTimeout(() => setSaveSuccess(null), 1800);
  };

  const handleResetToPrior = async (familyId: string, variantId: string) => {
    const initialFam = INITIAL_FAMILIES[familyId];
    const initialPrior = initialFam?.k[variantId];
    if (!initialPrior) return;

    await handleUpdateK(familyId, variantId, initialPrior.value);
  };

  const familyList = Object.values(families).length > 0 ? Object.values(families) : Object.values(INITIAL_FAMILIES);
  const activeFamily = families[selectedFamilyId] || INITIAL_FAMILIES[selectedFamilyId] || familyList[0];
  const activeEstimate = estimates[activeFamily?.id];
  const historyPoints = activeEstimate?.hist || [];

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-yellow-500/40 pb-4">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 border border-neutral-800 text-neutral-400 hover:text-white hover:border-yellow-400 transition-colors"
              title="Назад"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider font-mono flex items-center gap-2">
              <SlidersHorizontal className="w-6 h-6 text-yellow-400" />
              <span>Калибровка снарядов</span>
            </h1>
            <p className="text-xs text-neutral-400 font-mono">
              Коэффициенты переноса силы k (к каноническому снаряду) и обучение
            </p>
          </div>
        </div>
      </div>

      {/* Family Selector Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {familyList.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedFamilyId(f.id)}
            className={`px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${
              activeFamily?.id === f.id
                ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.4)]'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-600 hover:text-white'
            }`}
          >
            {f.name}
          </button>
        ))}
      </div>

      {activeFamily && (
        <div className="space-y-6">
          {/* Family Strength & History Chart */}
          <div className="border border-neutral-800 bg-neutral-950 p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <span className="text-[10px] font-mono font-black text-yellow-400 uppercase tracking-widest block">
                  Семейство движения
                </span>
                <h2 className="text-lg font-black uppercase tracking-tight text-white font-mono">
                  {activeFamily.name}
                </h2>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-neutral-400 uppercase block">
                  Текущая опорная сила (1ПМ канон)
                </span>
                <span className="text-xl font-black font-mono text-yellow-400">
                  {activeEstimate?.mu ? `${activeEstimate.mu.toFixed(1)} кг` : '—'}
                </span>
              </div>
            </div>

            {/* SVG Sparkline of mu over time with SD corridor */}
            {historyPoints.length >= 2 ? (
              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Динамика силы (μ ± 1 SD)</span>
                  </span>
                  <span>{historyPoints.length} сессий</span>
                </div>
                <div className="h-32 w-full bg-black border border-neutral-800 relative p-2">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 400 100" preserveAspectRatio="none">
                    {(() => {
                      const mus = historyPoints.map((p) => p.mu);
                      const minMu = Math.min(...mus) * 0.92;
                      const maxMu = Math.max(...mus) * 1.08;
                      const range = maxMu - minMu || 1;

                      // Coordinate mapper
                      const getX = (idx: number) => (idx / (historyPoints.length - 1)) * 400;
                      const getY = (val: number) => 100 - ((val - minMu) / range) * 100;

                      // Area path for SD band
                      const upperPoints = historyPoints.map((p, i) => `${getX(i)},${getY(p.mu + p.sd)}`);
                      const lowerPoints = historyPoints
                        .slice()
                        .reverse()
                        .map((p, i) => `${getX(historyPoints.length - 1 - i)},${getY(Math.max(0, p.mu - p.sd))}`);
                      const areaD = `M ${upperPoints.join(' L ')} L ${lowerPoints.join(' L ')} Z`;

                      // Line path for mu
                      const lineD = historyPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)},${getY(p.mu)}`).join(' ');

                      return (
                        <>
                          <path d={areaD} fill="rgba(250, 204, 21, 0.15)" />
                          <path d={lineD} fill="none" stroke="#facc15" strokeWidth="2.5" />
                          {historyPoints.map((p, i) => (
                            <circle
                              key={i}
                              cx={getX(i)}
                              cy={getY(p.mu)}
                              r="3.5"
                              fill="#facc15"
                              stroke="#000000"
                              strokeWidth="1.5"
                            />
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-black border border-neutral-800 text-center text-xs font-mono text-neutral-500">
                <Activity className="w-4 h-4 mx-auto mb-1 opacity-50" />
                <span>Недостаточно данных для графика (нужно хотя бы 2 тренировки)</span>
              </div>
            )}
          </div>

          {/* Variants & Coefficients Table */}
          <div className="border border-neutral-800 bg-black">
            <div className="p-3 bg-neutral-950 border-b border-neutral-800">
              <span className="font-mono font-bold text-xs uppercase tracking-wider text-neutral-300">
                Снаряды и коэффициенты k
              </span>
            </div>

            <div className="divide-y divide-neutral-900">
              {Object.entries(activeFamily.k).map(([vId, kPrior]) => {
                const isCanonical = vId === activeFamily.canonical;
                const priorInitial = INITIAL_FAMILIES[activeFamily.id]?.k[vId]?.value ?? 1.0;

                const confBadge =
                  kPrior.conf === 'high'
                    ? 'bg-green-500/20 text-green-400 border-green-500/40'
                    : kPrior.conf === 'med'
                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700';

                return (
                  <div key={vId} className="p-3.5 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex-1 min-w-[180px]">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-bold text-sm text-white">
                          {vId}
                        </span>
                        {isCanonical && (
                          <span className="px-1.5 py-0.2 bg-yellow-400 text-black text-[9px] font-mono font-black uppercase">
                            Канон (k = 1.0)
                          </span>
                        )}
                        <span className={`px-1.5 py-0.2 text-[9px] font-mono uppercase border ${confBadge}`}>
                          {kPrior.conf}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-400">
                        {kPrior.n} тренировок · приор: {priorInitial.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-neutral-400">k:</span>
                        <input
                          type="number"
                          step="0.01"
                          disabled={isCanonical}
                          value={kPrior.value}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              handleUpdateK(activeFamily.id, vId, val);
                            }
                          }}
                          className="w-20 h-9 px-2 text-center bg-neutral-950 border border-neutral-700 font-mono font-black text-sm text-yellow-400 focus:outline-none focus:border-yellow-400 disabled:opacity-50"
                        />
                      </div>

                      {!isCanonical && (
                        <button
                          onClick={() => handleResetToPrior(activeFamily.id, vId)}
                          className="px-2.5 py-2 border border-neutral-800 hover:border-yellow-400 text-neutral-400 hover:text-white text-xs font-mono transition-colors flex items-center gap-1"
                          title="Сбросить к исходному приору"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Сброс</span>
                        </button>
                      )}

                      {saveSuccess === `${activeFamily.id}_${vId}` && (
                        <span className="text-green-400 text-xs flex items-center gap-0.5 animate-pulse">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </span>
                      )}
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
