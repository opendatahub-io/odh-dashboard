import React from 'react';
import type { PipelineStatusFilter } from './types';

export type PipelineLabelMode = 'visible' | 'popover';
export type { PipelineStatusFilter };

export type PipelineDisplaySettings = {
  labelMode: PipelineLabelMode;
  showLabels: boolean;
  statusFilter: PipelineStatusFilter;
};

export const defaultPipelineDisplaySettings: PipelineDisplaySettings = {
  labelMode: 'visible',
  showLabels: true,
  statusFilter: 'in-progress',
};

const PipelineDisplayContext = React.createContext<PipelineDisplaySettings>(
  defaultPipelineDisplaySettings,
);

export const PipelineDisplayProvider: React.FC<
  React.PropsWithChildren<{ value: PipelineDisplaySettings }>
> = ({ value, children }) => (
  <PipelineDisplayContext.Provider value={value}>{children}</PipelineDisplayContext.Provider>
);

export const usePipelineDisplay = (): PipelineDisplaySettings =>
  React.useContext(PipelineDisplayContext);

export const shouldShowNodeLabels = (settings: PipelineDisplaySettings): boolean =>
  settings.labelMode === 'visible' || settings.showLabels;

export const shouldShowHoverPopover = (
  settings: PipelineDisplaySettings,
  hover: boolean,
): boolean => settings.labelMode === 'popover' && !settings.showLabels && hover;
