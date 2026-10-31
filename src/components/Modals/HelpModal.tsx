import React from 'react';
import { X, Target, Crosshair, Zap, Shield, AlertTriangle } from 'lucide-react';
import { Language } from '../../types/game';
import { getTranslation } from '../../services/i18n';
import { sounds } from '../../services/audio';

interface HelpModalProps {
  lang: Language;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ lang, onClose }) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-left animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-sky-400" />
            <h3 className="font-display text-lg font-bold text-white">
              {getTranslation(lang, 'instructions')}
            </h3>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Interception & Controls */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            {lang === 'zh' ? '拦截操作与预判瞄准' : 'Aiming & Interception'}
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {lang === 'zh'
              ? '• 点击/触摸屏幕任意位置发射萌兔拦截飞弹（小兔子形态）。'
              : '• Tap or click anywhere on screen to launch cute bunny interceptors.'}
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            {lang === 'zh'
              ? '• 萌兔飞弹飞至目标点（X标记）爆炸，产生的梦幻范围星光冲击波会摧毁碰到的敌方胡萝卜怪弹。'
              : '• Bunny missiles explode at your target (X mark), generating a starry pastel shockwave destroying nearby enemy carrot rockets.'}
          </p>
          <p className="text-xs text-amber-300 leading-relaxed font-medium">
            {lang === 'zh'
              ? '• 预判要诀：敌弹持续下落，切勿瞄准当前位置，必须瞄准其未来到达的预判落点！'
              : '• Lead Your Aim: Rockets keep moving! Shoot at where they WILL BE, not where they are now.'}
          </p>
        </div>

        {/* Section 2: Firepower & Munitions */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            {lang === 'zh' ? '齐射火力升级与房屋保卫' : 'Volley Firepower & House Defense'}
          </h4>
          <p className="text-xs text-pink-300 leading-relaxed font-semibold">
            {lang === 'zh'
              ? '★ 动态齐射机制：每击落 10 颗敌方炮弹，炮台齐射发射多增加 1 颗子弹！'
              : '★ Volley Upgrade: Every 10 enemy rockets intercepted adds +1 bullet to your volley!'}
          </p>
          <p className="text-xs text-rose-300 leading-relaxed font-semibold">
            {lang === 'zh'
              ? '✕ 房屋惩罚：底下的童话房屋每被击毁 1 座，炮塔齐射少发射 1 颗子弹（保底1发）。'
              : '✕ House Penalty: For every house destroyed, your turret volley loses 1 bullet (min 1).'}
          </p>
          <p className="text-xs text-slate-300 leading-relaxed">
            {lang === 'zh'
              ? '• 备弹储备：外侧防空塔各 25 发 | 内侧主防塔各 35 发。每轮结束补满并结算剩余奖励分！'
              : '• Munitions: Outer batteries 25 | Inner main citadels 35. Replenished full each wave with surplus bonus score!'}
          </p>
        </div>

        {/* Section 3: Victory & Failure Conditions */}
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            {lang === 'zh' ? '胜负判定准则' : 'Win / Loss Conditions'}
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            {lang === 'zh'
              ? '• 击落敌方火箭：每个击毁 +20 分。'
              : '• Destroy Enemy Rockets: +20 points per kill.'}
          </p>
          <p className="text-xs text-emerald-400 leading-relaxed font-medium">
            {lang === 'zh'
              ? '• 胜利判定：累计获得 1000 分即刻宣告保卫战胜利，点击再玩一次！'
              : '• Victory: Reach 1,000 points to claim victory!'}
          </p>
          <p className="text-xs text-rose-400 leading-relaxed font-medium">
            {lang === 'zh'
              ? '• 失败判定：当全部 4 座拦截炮台被击毁，防线溃败宣告失败。'
              : '• Defeat: Occurs when all 4 defense batteries are destroyed by enemy rockets.'}
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            {lang === 'zh'
              ? '• 城市保护：城市一旦被炸毁不会恢复；而炮台每轮结束后会自动检修恢复。'
              : '• City Defense: Destroyed cities do not recover; batteries are repaired each wave.'}
          </p>
        </div>

        <button
          onClick={() => {
            sounds.playClick();
            onClose();
          }}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors cursor-pointer mt-1"
        >
          {lang === 'zh' ? '关闭指令简报' : 'Close Briefing'}
        </button>
      </div>
    </div>
  );
};
