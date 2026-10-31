/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { HUD } from './components/HUD';
import { StartScreen } from './components/Modals/StartScreen';
import { VictoryModal } from './components/Modals/VictoryModal';
import { GameOverModal } from './components/Modals/GameOverModal';
import { RoundSummaryModal } from './components/Modals/RoundSummaryModal';
import { HelpModal } from './components/Modals/HelpModal';
import { PauseModal } from './components/Modals/PauseModal';
import { useMissileGame } from './hooks/useMissileGame';
import { Language } from './types/game';
import { sounds } from './services/audio';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('tina_defense_lang');
      if (saved === 'zh' || saved === 'en') return saved;
    } catch {
      // ignore
    }
    return 'zh';
  });

  const [isMuted, setIsMuted] = useState<boolean>(() => sounds.getMuted());
  const [showHelp, setShowHelp] = useState<boolean>(false);

  const {
    phase,
    score,
    stats,
    selectedBattery,
    setSelectedBattery,
    canvasRef,
    handleCanvasClick,
    handleCanvasMouseMove,
    handleCanvasTouch,
    startNewGame,
    startNextWave,
    togglePause,
    roundSummary,
  } = useMissileGame(lang);

  const handleToggleLang = () => {
    sounds.playClick();
    const nextLang: Language = lang === 'zh' ? 'en' : 'zh';
    setLang(nextLang);
    try {
      localStorage.setItem('tina_defense_lang', nextLang);
    } catch {
      // ignore
    }
  };

  const handleToggleMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
    if (!muted) {
      sounds.playClick();
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Top Bar Header */}
      <Header
        lang={lang}
        onToggleLang={handleToggleLang}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        phase={phase}
        onOpenHelp={() => setShowHelp(true)}
        onRestart={startNewGame}
        onTogglePause={togglePause}
      />

      {/* Main Game Arena */}
      <main className="relative flex-1 w-full h-full overflow-hidden bg-slate-950 flex items-center justify-center">
        {/* Full Interactive Canvas */}
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onTouchStart={handleCanvasTouch}
          className="w-full h-full block cursor-crosshair touch-none select-none"
        />

        {/* In-Game HUD overlay (active when playing, paused, or transitioning) */}
        {phase !== 'IDLE' && (
          <HUD
            lang={lang}
            stats={stats}
            selectedBattery={selectedBattery}
            onSelectBattery={setSelectedBattery}
          />
        )}

        {/* Start / Briefing Screen */}
        {phase === 'IDLE' && (
          <StartScreen
            lang={lang}
            onStart={startNewGame}
            onOpenHelp={() => setShowHelp(true)}
          />
        )}

        {/* Victory Modal (reached 1000 points) */}
        {phase === 'VICTORY' && (
          <VictoryModal
            lang={lang}
            stats={stats}
            onRestart={startNewGame}
          />
        )}

        {/* Game Over Modal (all 3 batteries destroyed) */}
        {phase === 'GAME_OVER' && (
          <GameOverModal
            lang={lang}
            stats={stats}
            onRestart={startNewGame}
          />
        )}

        {/* Inter-Wave Munitions Tally Modal */}
        {phase === 'ROUND_TRANSITION' && roundSummary && (
          <RoundSummaryModal
            lang={lang}
            summary={roundSummary}
            onNextWave={startNextWave}
          />
        )}

        {/* Pause Modal */}
        {phase === 'PAUSED' && (
          <PauseModal
            lang={lang}
            onResume={togglePause}
            onRestart={startNewGame}
          />
        )}

        {/* Rules & Tactical Briefing Modal */}
        {showHelp && (
          <HelpModal
            lang={lang}
            onClose={() => setShowHelp(false)}
          />
        )}
      </main>
    </div>
  );
}
