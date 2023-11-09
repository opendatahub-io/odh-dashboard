import { useParams } from 'react-router-dom';
import { useBrowserStorage } from '~/components/browserStorage';
import { BiasMetricConfig } from '~/concepts/explainability/types';
import { SetBrowserStorageHook } from '~/components/browserStorage/BrowserStorageContext';

const SELECTED_CHARTS_STORAGE_KEY_PREFIX = 'odh.dashboard.xai.selected_bias_charts';

const useBiasChartsBrowserStorage = (): [
  BiasMetricConfig[],
  SetBrowserStorageHook<BiasMetricConfig[]>,
] => {
  const { project, namespace, inferenceService } = useParams();

  const [selectedBiasConfigs, setSelectedBiasConfigs] = useBrowserStorage<BiasMetricConfig[]>(
    `${SELECTED_CHARTS_STORAGE_KEY_PREFIX}-${project ?? namespace}-${inferenceService}`,
    [],
    true,
    true,
  );

  return [selectedBiasConfigs, setSelectedBiasConfigs];
};

export default useBiasChartsBrowserStorage;
