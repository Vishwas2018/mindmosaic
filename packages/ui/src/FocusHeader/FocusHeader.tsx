'use client';

import type { ReactNode } from 'react';
import { Brand } from '../Brand/Brand.js';
import { IconButton } from '../IconButton/IconButton.js';
import { TopBar } from '../TopBar/TopBar.js';

export interface FocusHeaderProps {
  /** Centre slot — typically a Timer or session title. */
  centre?: ReactNode;
  /** Right-of-centre helper — typically a SavedPill or status badge. */
  helper?: ReactNode;
  onExit: () => void;
  /** Accessible label for the exit button. Defaults to "Exit session". */
  exitLabel?: string;
}

export function FocusHeader({
  centre,
  helper,
  onExit,
  exitLabel = 'Exit session',
}: FocusHeaderProps) {
  return (
    <TopBar>
      <Brand logoSrc="/logo.svg" size="sm" />
      <div className="ml-auto flex items-center gap-3">
        {centre}
        {helper}
        <IconButton
          label={exitLabel}
          icon={<span aria-hidden="true">×</span>}
          onClick={onExit}
        />
      </div>
    </TopBar>
  );
}
