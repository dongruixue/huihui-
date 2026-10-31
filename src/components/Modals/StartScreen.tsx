import React from 'react';
import { Shield, Target, Crosshair, Award, Zap, AlertTriangle } from 'lucide-react';
import { Language } from '../../types/game';
import { getTranslation } from '../../services/i18n';
import { sounds } from '../../services/audio';

interface StartScreenProps {
  lang: Language;
  onStart: () => void;
  onOpenHelp: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  lang,
  onStart,
  onOpenHelp,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 text-center animate-fade-in my-auto">
        {/* Title & Badge */}
        <div className="flex flex-col items-center gap-2">
          <div className="inline-flex items-center gap-2 text-xs font-arcade text-sky-400 tracking-wider uppercase bg-sky-950/60 border border-sky-500/20 px-3 py-1 rounded-full">
            <Crosshair className="w-3.5 h-3.5" />
            <span>NOVA AIR DEFENSE PROTOCOL</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-wide text-white">
            {getTranslation(lang, 'gameTitle')}
          </h1>
          <p className="text-sm md:text-base text-slate-400 max-w-md">
            {getTranslation(lang, 'gameSubtitle')}
          </p>
        </div>

        {/* 3 Core Rules Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-left">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-pink-400">
              <span className="text-base">🐰</span>
              <span className="font-semibold text-xs text-white">
                {lang === 'zh' ? '萌兔飞弹' : 'Bunny Rockets'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'zh'
                ? '发射可爱的小兔子飞弹，在预判空域爆发梦幻星空冲击波！'
                : 'Launch cute flying bunny rockets to intercept incoming threats.'}
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-amber-400">
              <Zap className="w-4 h-4 shrink-0" />
              <span className="font-semibold text-xs text-white">
                {lang === 'zh' ? '齐射火力机制' : 'Volley Firepower'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'zh'
                ? '每击落10颗敌弹齐射+1发；童话房屋每被毁1座则齐射-1发！'
                : '+1 shot per 10 kills; -1 shot for each fairytale house destroyed!'}
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3.5 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-emerald-400">
              <Award className="w-4 h-4 shrink-0" />
              <span className="font-semibold text-xs text-white">
                {lang === 'zh' ? '战胜目标' : '1000 Pts Victory'}
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lang === 'zh'
                ? '击落胡萝卜怪弹+20分，达1000分大捷！4座炮台全损则宣告失败。'
                : '+20 pts per kill. Reach 1000 to win; lose if all defense batteries fall.'}
            </p>
          </div>
        </div>

        {/* Tactical Defense Note */}
        <div className="bg-pink-950/30 border border-pink-500/20 rounded-xl px-4 py-2.5 text-xs text-pink-300 text-left flex items-start gap-2.5">
          <Shield className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
          <span>
            {lang === 'zh'
              ? '温馨提示：小镇房屋被炸毁后本轮无法恢复；炮台受损每轮结束后会自动修好并补满弹药。点击天空任意处发射萌兔！'
              : 'Tip: Destroyed fairytale houses cannot be rebuilt, but batteries restore every wave. Tap the sky to launch bunny interceptors!'}
          </span>
        </div>

        {/* Start Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              sounds.playClick();
              onStart();
            }}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-base shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all transform hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
          >
            {getTranslation(lang, 'startMission')}
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onOpenHelp();
            }}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            {getTranslation(lang, 'instructions')}
          </button>
        </div>
      </div>
    </div>
  );
};
