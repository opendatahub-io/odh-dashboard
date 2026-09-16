import * as React from 'react';
import type {
  AIHubKind,
  DataScienceClusterInitializationKindStatus,
  DataScienceClusterKindStatus,
} from '@odh-dashboard/k8s-core';
import type { IsAreaAvailableStatus, SupportedAreaType } from './types';

export type AreaContextState = {
  /**
   * If value is `null`:
   *   Using the v1 Operator, no status to pull
   *   TODO: Remove when we no longer want to support v1
   */
  dscStatus: DataScienceClusterKindStatus | null;
  dsciStatus: DataScienceClusterInitializationKindStatus | null;
  aiHub: AIHubKind | null;
  /**
   * An AIHub read failure is kept separate from the global DSC state so that
   * only consumers that require the model registry namespace are blocked.
   */
  aiHubError?: Error;
  areasStatus: Record<SupportedAreaType, IsAreaAvailableStatus | undefined>;
};

export const AreaContext = React.createContext<AreaContextState>({
  dscStatus: null,
  dsciStatus: null,
  aiHub: null,
  aiHubError: undefined,
  areasStatus: {},
});
