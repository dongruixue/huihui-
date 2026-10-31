import React from 'react';
import { Target, Shield, Crosshair } from 'lucide-react';
import { Language, GameStats } from '../types/game';
import { getTranslation } from '../services/i18n';
import { sounds } from '../services/audio';

interface HUDProps {
  lang: Language;
  stats: GameStats;
  selectedBattery: number | null;
  onSelectBattery: (index: number | null) => void;
}

export const HUD: React.FC<HUDProps> = ({
  lang,
  stats,
  selectedBattery,
  onSelectBattery,
}) => {
  const targetScore = stats.targetScore || 1000;
  const progressPercent = Math.min(100, Math.floor((stats.score / targetScore) * 100));

  return (
    <div className="pointer-events-none absolute inset-0 p-3 md:p-5 flex flex-col justify-between select-none">
      {/* Top HUD Row */}
      <div className="flex items-start justify-between gap-3 w-full">
        {/* Left: Score & 1000 Pts Victory Goal Tracker */}
        <div className="pointer-events-auto bg-slate-900/85 border border-slate-800 rounded-xl p-2.5 md:p-3 shadow-lg backdrop-blur-md flex flex-col gap-1.5 min-w-[150px] md:min-w-[190px]">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium tracking-wide uppercase">{getTranslation(lang, 'score')}</span>
            <span className="text-sky-400 text-[11px] font-arcade font-medium">
              {getTranslation(lang, 'targetScoreLabel')}: {targetScore}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-arcade text-2xl md:text-3xl font-bold tracking-tight text-white tabular-nums">
              {stats.score}
            </span>
            <span className="text-xs text-emerald-400 font-arcade">
              {getTranslation(lang, 'scorePerKill')}
            </span>
          </div>

          {/* Goal Progress Bar */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Center: Wave / Round indicator & Stage Subtitle & Firepower Badge */}
        <div className="flex flex-col items-center gap-1.5 pointer-events-auto">
          <div className="bg-slate-900/85 border border-slate-800 rounded-full px-3.5 py-1 shadow-md backdrop-blur-md flex items-center gap-2">
            <Crosshair className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-arcade text-xs md:text-sm font-semibold tracking-wider text-slate-200 uppercase">
              {stats.round === 1 ? getTranslation(lang, 'stageName1') :
               stats.round === 2 ? getTranslation(lang, 'stageName2') :
               stats.round === 3 ? getTranslation(lang, 'stageName3') :
               stats.round === 4 ? getTranslation(lang, 'stageName4') :
               stats.round === 5 ? getTranslation(lang, 'stageName5') :
               getTranslation(lang, 'stageNameMore', { round: stats.round })}
            </span>
          </div>

          {/* Firepower Volley Multiplier Badge */}
          <div 
            className="bg-pink-950/70 border border-pink-500/40 rounded-full px-3 py-0.5 shadow-md backdrop-blur-md flex items-center gap-1.5 text-pink-300 text-[11px] font-arcade font-bold tracking-wide"
            title={getTranslation(lang, 'firepowerRule')}
          >
            <span>🐰</span>
            <span>{getTranslation(lang, 'firepowerLevel', { count: stats.firepower || 1 })}</span>
          </div>
        </div>

        {/* Right: Defense Grid Status / Destroyed count */}
        <div className="pointer-events-auto bg-slate-900/85 border border-slate-800 rounded-xl p-2.5 md:p-3 shadow-lg backdrop-blur-md flex items-center gap-3">
          <div className="flex flex-col text-right">
            <span className="text-[11px] text-slate-400 tracking-wide">
              {getTranslation(lang, 'statRocketsDestroyed')}
            </span>
            <span className="font-arcade text-lg md:text-xl font-bold text-sky-400 tabular-nums">
              {stats.rocketsDestroyed}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-sky-950/60 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Target className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Bottom Battery Selector Controls - 4 Batteries + Auto */}
      <div className="pointer-events-auto flex items-center justify-center gap-2 md:gap-3 pb-1">
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-1.5 backdrop-blur-md shadow-xl flex items-center gap-1 flex-wrap justify-center">
          <button
            onClick={() => {
              onSelectBattery(null);
              sounds.playClick();
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              selectedBattery === null
                ? 'bg-sky-500 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            {getTranslation(lang, 'batterySelectorAuto')}
          </button>

          <button
            onClick={() => {
              onSelectBattery(0);
              sounds.playClick();
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              selectedBattery === 0
                ? 'bg-sky-500 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            <span className="text-[10px] text-sky-300 font-arcade mr-1">[1]</span>
            {getTranslation(lang, 'battery1')} (25)
          </button>

          <button
            onClick={() => {
              onSelectBattery(1);
              sounds.playClick();
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              selectedBattery === 1
                ? 'bg-sky-500 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            <span className="text-[10px] text-sky-300 font-arcade mr-1">[2]</span>
            {getTranslation(lang, 'battery2')} (35)
          </button>

          <button
            onClick={() => {
              onSelectBattery(2);
              sounds.playClick();
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              selectedBattery === 2
                ? 'bg-sky-500 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            <span className="text-[10px] text-sky-300 font-arcade mr-1">[3]</span>
            {getTranslation(lang, 'battery3')} (35)
          </button>

          <button
            onClick={() => {
              onSelectBattery(3);
              sounds.playClick();
            }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              selectedBattery === 3
                ? 'bg-sky-500 text-white shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
          >
            <span className="text-[10px] text-sky-300 font-arcade mr-1">[4]</span>
            {getTranslation(lang, 'battery4')} (25)
          </button>
        </div>
      </div>
    </div>
  );
};
