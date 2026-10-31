import React from 'react';
import { Skull, RotateCcw, AlertOctagon, Target } from 'lucide-react';
import { Language, GameStats } from '../../types/game';
import { getTranslation } from '../../services/i18n';
import { sounds } from '../../services/audio';

interface GameOverModalProps {
  lang: Language;
  stats: GameStats;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  lang,
  stats,
  onRestart,
}) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-md w-full bg-slate-900 border border-rose-500/30 rounded-2xl p-6 md:p-8 shadow-[0_0_40px_rgba(244,63,94,0.2)] flex flex-col gap-6 text-center animate-fade-in">
        {/* Failure Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-2 shadow-[0_0_20px_rgba(244,63,94,0.25)]">
            <AlertOctagon className="w-8 h-8" />
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-wide text-white">
            {getTranslation(lang, 'gameOverTitle')}
          </h2>
          <p className="text-sm text-rose-300">
            {getTranslation(lang, 'gameOverSubtitle')}
          </p>
        </div>

        {/* Casualty Report */}
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col gap-3 text-left">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {getTranslation(lang, 'gameOverStatsHeader')}
          </span>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400">{getTranslation(lang, 'totalScoreLabel')}</span>
              <span className="font-arcade text-xl font-bold text-white tabular-nums">
                {stats.score} / {stats.targetScore}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs text-slate-400">{getTranslation(lang, 'statRocketsDestroyed')}</span>
              <span className="font-arcade text-xl font-bold text-sky-400 tabular-nums">
                {stats.rocketsDestroyed}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs text-slate-400">{getTranslation(lang, 'statRoundsSurvived')}</span>
              <span className="font-arcade text-xl font-bold text-amber-400 tabular-nums">
                {stats.round}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs text-slate-400">{getTranslation(lang, 'statMissilesFired')}</span>
              <span className="font-arcade text-xl font-bold text-slate-300 tabular-nums">
                {stats.missilesFired}
              </span>
            </div>
          </div>
        </div>

        {/* Defeat Advice */}
        <p className="text-xs text-slate-400 leading-relaxed">
          {getTranslation(lang, 'aimTip')}
        </p>

        {/* Try Again Button */}
        <button
          onClick={() => {
            sounds.playClick();
            onRestart();
          }}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-semibold text-base shadow-[0_0_20px_rgba(244,63,94,0.35)] transition-all cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
        >
          <RotateCcw className="w-4 h-4" />
          <span>{lang === 'zh' ? '重新部署防御' : 'Try Again'}</span>
        </button>
      </div>
    </div>
  );
};
