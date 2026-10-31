import React from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { Language } from '../../types/game';
import { getTranslation } from '../../services/i18n';
import { sounds } from '../../services/audio';

interface PauseModalProps {
  lang: Language;
  onResume: () => void;
  onRestart: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  lang,
  onResume,
  onRestart,
}) => {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-xs w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 text-center animate-fade-in">
        <h3 className="font-display text-xl font-bold text-white tracking-wider">
          {getTranslation(lang, 'paused')}
        </h3>
        <p className="text-xs text-slate-400">
          {lang === 'zh'
            ? '防空拦截系统已进入战术暂留状态。'
            : 'Air defense systems currently suspended in tactical hold.'}
        </p>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => {
              sounds.playClick();
              onResume();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{getTranslation(lang, 'resume')}</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onRestart();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{getTranslation(lang, 'restart')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
