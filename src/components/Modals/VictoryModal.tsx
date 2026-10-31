import React from 'react';
import { Trophy, RotateCcw, Target, Shield, Crosshair } from 'lucide-react';
import { Language, GameStats } from '../../types/game';
import { getTranslation } from '../../services/i18n';
import { sounds } from '../../services/audio';

interface VictoryModalProps {
  lang: Language;
  stats: GameStats;
  onRestart: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  lang,
  stats,
  onRestart,
}) => {
  const accuracy = stats.missilesFired > 0
    ? Math.min(100, Math.round((stats.rocketsDestroyed / stats.missilesFired) * 100))
    : 0;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-md w-full bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 md:p-8 shadow-[0_0_40px_rgba(16,185,129,0.2)] flex flex-col gap-6 text-center animate-fade-in">
        {/* Victory Icon & Title */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Trophy className="w-8 h-8" />
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-wide text-white">
            {getTranslation(lang, 'victoryTitle')}
          </h2>
          <p className="text-sm text-emerald-300">
            {getTranslation(lang, 'victorySubtitle')}
          </p>
        </div>

        {/* Combat Debrief Metrics */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col gap-3 text-left">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {getTranslation(lang, 'victoryStatsHeader')}
          </span>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">{getTranslation(lang, 'totalScoreLabel')}</span>
              <span className="font-arcade text-xl font-bold text-emerald-400 tabular-nums">
                {stats.score}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs text-slate-400">{getTranslation(lang, 'statRocketsDestroyed')}</span>
              <span className="font-arcade text-xl font-bold text-white tabular-nums">
                {stats.rocketsDestroyed}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs text-slate-400">{getTranslation(lang, 'statAccuracy')}</span>
              <span className="font-arcade text-xl font-bold text-sky-400 tabular-nums">
                {accuracy}%
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs text-slate-400">{getTranslation(lang, 'statRoundsSurvived')}</span>
              <span className="font-arcade text-xl font-bold text-amber-400 tabular-nums">
                {stats.round}
              </span>
            </div>
          </div>
        </div>

        {/* Restart Button: "再玩一次" / "Play Again" */}
        <button
          onClick={() => {
            sounds.playClick();
            onRestart();
          }}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-semibold text-base shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{getTranslation(lang, 'playAgain')}</span>
        </button>
      </div>
    </div>
  );
};
