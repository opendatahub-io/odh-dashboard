import * as React from 'react';
import type { TreeStepState } from './treeStepState';

export const JUST_COMPLETED_DURATION_MS = 2000;

export type WinnerRank = 1 | 2 | 3;

export const isWinnerRank = (value: unknown): value is WinnerRank =>
  value === 1 || value === 2 || value === 3;

export type TreeNodeVisualState =
  'pending' | 'active' | 'just-completed' | 'success' | 'failed' | 'winner';

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Flash the just-completed chrome for ~2s after a node leaves the running state.
 * Already-completed nodes (initial load / remount) stay in the resting success state.
 */
export const useJustCompleted = (stepState: TreeStepState): boolean => {
  const previousStateRef = React.useRef<TreeStepState>(stepState);
  const [justCompleted, setJustCompleted] = React.useState(false);

  React.useEffect(() => {
    const previousState = previousStateRef.current;
    previousStateRef.current = stepState;

    if (stepState !== 'completed' || previousState !== 'active' || prefersReducedMotion()) {
      setJustCompleted(false);
      return undefined;
    }

    setJustCompleted(true);
    const timeoutId = window.setTimeout(() => {
      setJustCompleted(false);
    }, JUST_COMPLETED_DURATION_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [stepState]);

  return justCompleted;
};

export const resolveTreeNodeVisualState = ({
  stepState,
  justCompleted,
  isResolvedWinner,
}: {
  stepState: TreeStepState;
  justCompleted: boolean;
  isResolvedWinner?: boolean;
}): TreeNodeVisualState => {
  if (isResolvedWinner && stepState === 'completed') {
    return 'winner';
  }
  if (stepState === 'failed') {
    return 'failed';
  }
  if (stepState === 'active') {
    return 'active';
  }
  if (stepState === 'completed') {
    return justCompleted ? 'just-completed' : 'success';
  }
  return 'pending';
};
