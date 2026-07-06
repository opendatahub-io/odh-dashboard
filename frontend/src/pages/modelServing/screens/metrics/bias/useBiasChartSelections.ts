import { useParams } from 'react-router-dom';
import React from 'react';
import { useBrowserStorage } from '#~/components/browserStorage/BrowserStorageContext';
import { BiasMetricConfig } from '#~/concepts/trustyai/types';
import { byId } from '#~/pages/modelServing/screens/metrics/utils';

const SELECTED_CHARTS_STORAGE_KEY_PREFIX = 'odh.dashboard.xai.selected_bias_charts';

const useBiasChartSelections = (
  biasMetricConfigs: BiasMetricConfig[],
): [BiasMetricConfig[], (x: BiasMetricConfig[]) => void, boolean] => {
  const { project, namespace, inferenceService } = useParams();

  // This hook is pristine until a user manually changes the selected values
  const isPristine = React.useRef(true);

  const [selectedBiasConfigs, setSelectedBiasConfigs] = useBrowserStorage<BiasMetricConfig[]>(
    `${SELECTED_CHARTS_STORAGE_KEY_PREFIX}-${project ?? namespace ?? ''}-${inferenceService ?? ''}`,
    [],
    true,
    true,
  );

  const settled = !(
    isPristine.current &&
    selectedBiasConfigs.length === 0 &&
    biasMetricConfigs.length > 0
  );

  // Used to change the selections from outside the hook, so we know whether we have a pristine state.
  // Inside the hook call the state setter directly.
  const setSelectedBiasConfigsDecorator = React.useCallback(
    (newValue: BiasMetricConfig[]) => {
      if (isPristine.current) {
        isPristine.current = false;
      }
      setSelectedBiasConfigs(newValue);
    },
    [setSelectedBiasConfigs],
  );

  React.useEffect(() => {
    // If the hook is pristine and no BiasMetricConfigs are selected, auto-select an arbitrary config for the user.
    // This is for a UX requirement that the user doesn't land on an empty state - however an empty state
    // still needs to be shown if the user explicitly deselects all values.
    if (isPristine.current) {
      if (selectedBiasConfigs.length === 0 && biasMetricConfigs.length > 0) {
        setSelectedBiasConfigs([biasMetricConfigs[0]]);
      }
    }
  }, [biasMetricConfigs, selectedBiasConfigs.length, setSelectedBiasConfigs]);

  React.useEffect(() => {
    // If the backing data has changed, invalidate the cache to avoid any stale data. This could happen if a
    // BiasMetricConfig has been deleted from the config page, or via direct call to the Trusty API.
    if (selectedBiasConfigs.length > 0) {
      setSelectedBiasConfigs(selectedBiasConfigs.filter((x) => biasMetricConfigs.find(byId(x))));
    }
    // Invalidate the session store cache ONLY IF the backing dataset has changed.
    // eslint-disable-next-line
  }, [biasMetricConfigs, setSelectedBiasConfigs]);

  return [selectedBiasConfigs, setSelectedBiasConfigsDecorator, settled];
};

export default useBiasChartSelections;
