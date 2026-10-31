import React from 'react';
import { ArrowRight, ShieldCheck, Zap, Award } from 'lucide-react';
import { Language } from '../../types/game';
import { getTranslation } from '../../services/i18n';
import { sounds } from '../../services/audio';

interface RoundSummaryModalProps {
  lang: Language;
  summary: {
    round: number;
    surplusAmmo: number;
    ammoBonus: number;
    survivingCities: number;
    cityBonus: number;
    waveScore: number;
    newTotal: number;
  };
  onNextWave: () => void;
}

export const RoundSummaryModal: React.FC<RoundSummaryModalProps> = ({
  lang,
  summary,
  onNextWave,
}) => {
  return (
    <div className="absolute inset-0 z-35 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-md w-full bg-slate-900 border border-sky-500/30 rounded-2xl p-6 md:p-8 shadow-[0_0_30px_rgba(56,189,248,0.2)] flex flex-col gap-6 text-center animate-fade-in">
        {/* Header */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-1">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-wide text-white">
            {getTranslation(lang, 'roundClearTitle')}
          </h2>
          <p className="text-xs text-slate-400 max-w-xs">
            {getTranslation(lang, 'roundClearDesc')}
          </p>
        </div>

        {/* Munitions & City Bonus Tally Card */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col gap-3 text-left">
          {/* Ammo Bonus */}
          <div className="flex items-center justify-between text-sm py-1 border-b border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-300">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>{getTranslation(lang, 'ammoBonusLabel')}</span>
              <span className="text-xs text-slate-500">({summary.surplusAmmo} × 5)</span>
            </div>
            <span className="font-arcade font-bold text-amber-400 tabular-nums">
              +{summary.ammoBonus}
            </span>
          </div>

          {/* City Bonus */}
          <div className="flex items-center justify-between text-sm py-1 border-b border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-300">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>{getTranslation(lang, 'cityBonusLabel')}</span>
              <span className="text-xs text-slate-500">({summary.survivingCities} × 30)</span>
            </div>
            <span className="font-arcade font-bold text-emerald-400 tabular-nums">
              +{summary.cityBonus}
            </span>
          </div>

          {/* Total Accumulated Score */}
          <div className="flex items-center justify-between text-sm pt-1">
            <span className="font-semibold text-slate-200">{getTranslation(lang, 'totalScoreLabel')}</span>
            <span className="font-arcade text-xl font-bold text-sky-400 tabular-nums">
              {summary.newTotal} / 1000
            </span>
          </div>
        </div>

        {/* Notice of Munitions Refill */}
        <p className="text-xs text-slate-400 bg-slate-800/40 border border-slate-800 rounded-lg p-2.5">
          {lang === 'zh'
            ? '✓ 弹药已补充至满额：外侧各 25 发 / 内侧主防塔各 35 发，4座防空塔已全面就绪。'
            : '✓ Batteries refilled to max: Outer 25 / Inner 35 missiles across all 4 batteries, ready for action.'}
        </p>

        {/* Deploy Next Wave Button */}
        <button
          onClick={() => {
            sounds.playClick();
            onNextWave();
          }}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-base shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <span>{getTranslation(lang, 'nextWaveBtn')}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
