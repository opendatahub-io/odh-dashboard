import * as React from 'react';
import type {
  DataScienceClusterInitializationKindStatus,
  DataScienceClusterKindStatus,
} from '@odh-dashboard/internal/types-core';
import type { IsAreaAvailableStatus, SupportedAreaType } from './types';

export type AreaContextState = {
  /**
   * If value is `null`:
   *   Using the v1 Operator, no status to pull
   */
  dscStatus: DataScienceClusterKindStatus | null;
  dsciStatus: DataScienceClusterInitializationKindStatus | null;
  areasStatus: Record<SupportedAreaType, IsAreaAvailableStatus | undefined>;
};

export const AreaContext = React.createContext<AreaContextState>({
  dscStatus: null,
  dsciStatus: null,
  areasStatus: {},
});
