import React from 'react';
import { Volume2, VolumeX, Globe, HelpCircle, RotateCcw, Pause, Play } from 'lucide-react';
import { Language, GamePhase } from '../types/game';
import { getTranslation } from '../services/i18n';
import { sounds } from '../services/audio';

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  phase: GamePhase;
  onOpenHelp: () => void;
  onRestart: () => void;
  onTogglePause: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  isMuted,
  onToggleMute,
  phase,
  onOpenHelp,
  onRestart,
  onTogglePause,
}) => {
  return (
    <header className="flex items-center justify-between gap-4 md:gap-8 px-4 md:px-8 py-3 bg-slate-900/90 border-b border-slate-800 text-slate-100 backdrop-blur-md select-none shrink-0 z-20">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400 font-display font-bold text-base shadow-[0_0_12px_rgba(56,189,248,0.25)]">
          T
        </div>
        <span className="font-display font-bold tracking-wider text-base md:text-lg text-white whitespace-nowrap">
          {getTranslation(lang, 'gameTitle')}
        </span>
      </div>

      {/* Zone 2: Single-line controls & navigation */}
      <nav className="flex items-center gap-2 md:gap-4 text-xs md:text-sm font-medium text-slate-300">
        {/* Bilingual Language Switch */}
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition-colors text-slate-300 hover:text-white cursor-pointer whitespace-nowrap"
          title={lang === 'zh' ? '切换为英文' : 'Switch to Chinese'}
        >
          <Globe className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-arcade">{lang === 'zh' ? 'EN' : '中文'}</span>
        </button>

        {/* Audio Mute Switch */}
        <button
          onClick={onToggleMute}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition-colors text-slate-300 hover:text-white cursor-pointer whitespace-nowrap"
          title={isMuted ? getTranslation(lang, 'soundOn') : getTranslation(lang, 'soundOff')}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-rose-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-emerald-400" />
          )}
          <span className="hidden sm:inline">
            {isMuted ? getTranslation(lang, 'soundOff') : getTranslation(lang, 'soundOn')}
          </span>
        </button>

        {/* Tactical Briefing Button */}
        <button
          onClick={onOpenHelp}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition-colors text-slate-300 hover:text-white cursor-pointer whitespace-nowrap"
        >
          <HelpCircle className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">{getTranslation(lang, 'instructions')}</span>
        </button>

        {/* Restart in active play */}
        {phase === 'PLAYING' && (
          <button
            onClick={onRestart}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            title={getTranslation(lang, 'restart')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{getTranslation(lang, 'restart')}</span>
          </button>
        )}
      </nav>

      {/* Zone 3: 1 Primary Action (Pause/Resume or Status) */}
      <div className="flex items-center gap-2 shrink-0">
        {phase === 'PLAYING' && (
          <button
            onClick={onTogglePause}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <Pause className="w-3.5 h-3.5 text-amber-400" />
            <span>{getTranslation(lang, 'pause')}</span>
          </button>
        )}

        {phase === 'PAUSED' && (
          <button
            onClick={onTogglePause}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shadow-sm cursor-pointer whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{getTranslation(lang, 'resume')}</span>
          </button>
        )}
      </div>
    </header>
  );
};
