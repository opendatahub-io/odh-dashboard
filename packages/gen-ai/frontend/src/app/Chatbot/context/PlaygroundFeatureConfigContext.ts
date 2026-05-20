import React from 'react';
import type { PlaygroundFeatureConfig } from '@odh-dashboard/plugin-core/types';

/**
 * Default feature config for standalone (full) mode — all features visible.
 */
export const STANDALONE_FEATURE_CONFIG: Required<PlaygroundFeatureConfig> = {
  showModelPicker: true,
  showMcpServerConfig: true,
  showRagToggle: true,
  showCompareMode: true,
  showViewCodeModal: true,
  showNewChatModal: true,
  showSystemInstructions: true,
  showGuardrailConfig: true,
};

/**
 * Default feature config for embedded mode — most features hidden.
 */
export const EMBEDDED_FEATURE_CONFIG: Required<PlaygroundFeatureConfig> = {
  showModelPicker: false,
  showMcpServerConfig: false,
  showRagToggle: false,
  showCompareMode: false,
  showViewCodeModal: false,
  showNewChatModal: false,
  showSystemInstructions: false,
  showGuardrailConfig: false,
};

export const PlaygroundFeatureConfigContext =
  React.createContext<Required<PlaygroundFeatureConfig>>(STANDALONE_FEATURE_CONFIG);

/**
 * Hook to read the current playground feature visibility configuration.
 */
export const usePlaygroundFeatureConfig = (): Required<PlaygroundFeatureConfig> =>
  React.useContext(PlaygroundFeatureConfigContext);
