import React from 'react';
import { fireTopologyTypeSelected } from './llmdTrackingConstants';
import { TopologyType, type LLMInferenceServiceConfigKind } from '../types';
import { TOPOLOGY_CONFIG_DEFAULT } from '../const';

type TopologySelectionTrackingOptions = {
  topologyType?: TopologyType;
  configurationData?: unknown;
  externalData?: {
    data: { configsByTopology: Record<TopologyType, LLMInferenceServiceConfigKind[]> };
    loaded: boolean;
    loadError?: Error;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Track user topology changes after the separate configuration field resolves its selection.
 * Call the returned callback before updating the topology. It records intent, not an event:
 * exiting before configuration resolution emits nothing, and initial/edit hydration is ignored.
 */
export const useTopologySelectionTracking = ({
  topologyType,
  configurationData,
  externalData,
}: TopologySelectionTrackingOptions): ((nextTopologyType: TopologyType) => void) => {
  // Remember only user-initiated topology changes, not initial state or edit hydration.
  // A newer selection replaces any pending change whose configuration has not resolved yet.
  const pendingTracking = React.useRef<
    { topologyType: TopologyType; previousPattern?: TopologyType } | undefined
  >(undefined);
  const configsByTopology = externalData?.data.configsByTopology;

  const trackTopologySelection = React.useCallback(
    (nextTopologyType: TopologyType) => {
      if (nextTopologyType !== topologyType) {
        pendingTracking.current = { topologyType: nextTopologyType, previousPattern: topologyType };
      }
    },
    [topologyType],
  );

  // The dropdown handler knows the new topology before the separate configuration field has
  // resolved its selection. Synchronize analytics with that later committed state so the event
  // includes the effective configuration ID rather than the previous topology's configuration.
  // This effect does not select configurations or delay UI updates; it only completes tracking.
  React.useEffect(() => {
    const pending = pendingTracking.current;
    if (
      !pending ||
      topologyType !== pending.topologyType ||
      !externalData?.loaded ||
      externalData.loadError
    ) {
      return;
    }

    // Wait for the configuration field to expose its resolved selection; do not guess from
    // configRef or list ordering while the field may still be resetting/resolving.
    if (!isRecord(configurationData)) {
      return;
    }
    const { selectedConfig } = configurationData;
    let topologyConfigurationId: string | undefined;
    // Only single-node serving supports the built-in default. Other selections must belong
    // to the pending topology's configuration list, excluding stale incompatible selections.
    if (
      selectedConfig === TOPOLOGY_CONFIG_DEFAULT &&
      pending.topologyType === TopologyType.SINGLE_NODE
    ) {
      topologyConfigurationId = TOPOLOGY_CONFIG_DEFAULT;
    } else if (isRecord(selectedConfig) && isRecord(selectedConfig.metadata)) {
      const { name } = selectedConfig.metadata;
      const configForTopology = configsByTopology?.[pending.topologyType]?.find(
        (config) => config.metadata.name === name,
      );
      if (typeof name === 'string' && configForTopology) {
        topologyConfigurationId = name;
      }
    }

    // Accept the effective compatible selection, including restored edit configurations.
    // List ordering is not a resolution signal and must not suppress non-first selections.
    if (!topologyConfigurationId) {
      return;
    }

    // Consume before emitting so rerenders/effect replays cannot duplicate the event.
    // Without another user topology change, subsequent config-only changes are not tracked here.
    pendingTracking.current = undefined;
    fireTopologyTypeSelected({
      llmdComposablePattern: pending.topologyType,
      topologyConfigurationId,
      previousPattern: pending.previousPattern,
    });
  }, [topologyType, configurationData, externalData, configsByTopology]);

  return trackTopologySelection;
};
