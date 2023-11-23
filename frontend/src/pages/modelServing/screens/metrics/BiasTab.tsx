import React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  PageSection,
  PageSectionVariants,
  Spinner,
  Stack,
  StackItem,
  Title,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import MetricsPageToolbar from '~/pages/modelServing/screens/metrics/MetricsPageToolbar';
import BiasMetricConfigSelector from '~/pages/modelServing/screens/metrics/BiasMetricConfigSelector';
import { useExplainabilityModelData } from '~/concepts/explainability/useExplainabilityModelData';
import TrustyChart from '~/pages/modelServing/screens/metrics/TrustyChart';
import EmptyBiasConfigurationCard from '~/pages/modelServing/screens/metrics/EmptyBiasConfigurationCard';
import EmptyBiasChartSelectionCard from '~/pages/modelServing/screens/metrics/EmptyBiasChartSelectionCard';
import DashboardExpandableSection from '~/concepts/dashboard/DashboardExpandableSection';
import useBiasChartsBrowserStorage from '~/pages/modelServing/screens/metrics/useBiasChartsBrowserStorage';
import { ModelMetricType } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import EnsureMetricsAvailable from '~/pages/modelServing/screens/metrics/EnsureMetricsAvailable';
import { byId } from '~/pages/modelServing/screens/metrics/utils';

const OPEN_WRAPPER_STORAGE_KEY_PREFIX = `odh.dashboard.xai.bias_metric_chart_wrapper_open`;
const BiasTab: React.FC = () => {
  const { biasMetricConfigs, loaded, loadError } = useExplainabilityModelData();

  const [selectedBiasConfigs, setSelectedBiasConfigs] = useBiasChartsBrowserStorage();

  const firstRender = React.useRef(true);

  React.useEffect(() => {
    if (loaded && !loadError) {
      // It's possible a biasMetricConfig was deleted by the user directly accessing a backend API. We need to verify
      // that any saved state in the session storage is not stale and if it is, remove it.
      setSelectedBiasConfigs(selectedBiasConfigs.filter((x) => biasMetricConfigs.find(byId(x))));

      if (firstRender.current) {
        // If the user has just navigated here AND they haven't previously selected any charts to display,
        // don't show them the "No selected" empty state, instead show them the first available chart.
        // However, the user still needs to be shown said empty state if they deselect all charts.
        firstRender.current = false;
        if (selectedBiasConfigs.length === 0 && biasMetricConfigs.length > 0) {
          // If biasMetricConfigs is empty, the "No Configured Metrics" empty state will be shown, so no need
          // to set anything.
          setSelectedBiasConfigs([biasMetricConfigs[0]]);
        }
      }
    }
  }, [loaded, biasMetricConfigs, setSelectedBiasConfigs, selectedBiasConfigs, loadError]);

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (loadError) {
    return (
      <PageSection isFilled variant={PageSectionVariants.light}>
        <EmptyState variant={EmptyStateVariant.large}>
          <EmptyStateIcon icon={ExclamationCircleIcon} />
          <Title headingLevel="h5" size="lg">
            TrustyAI Error
          </Title>
          <EmptyStateBody>
            <Stack hasGutter>
              <StackItem>We encountered an error accessing the TrustyAI service:</StackItem>
              <StackItem>{loadError?.message}</StackItem>
            </Stack>
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  return (
    <EnsureMetricsAvailable
      metrics={[ModelMetricType.TRUSTY_AI_SPD, ModelMetricType.TRUSTY_AI_DIR]}
      accessDomain="model bias metrics"
    >
      <Stack>
        <StackItem>
          <MetricsPageToolbar
            leftToolbarItem={
              <ToolbarGroup>
                <Stack>
                  <StackItem>
                    <ToolbarItem variant="label">Metrics to display</ToolbarItem>
                  </StackItem>
                  <StackItem>
                    <ToolbarItem>
                      <BiasMetricConfigSelector
                        onChange={setSelectedBiasConfigs}
                        initialSelections={selectedBiasConfigs}
                      />
                    </ToolbarItem>
                  </StackItem>
                </Stack>
              </ToolbarGroup>
            }
          />
        </StackItem>
        <PageSection isFilled>
          <Stack hasGutter>
            {(biasMetricConfigs.length === 0 && (
              <StackItem>
                <EmptyBiasConfigurationCard />
              </StackItem>
            )) ||
              (selectedBiasConfigs.length === 0 && (
                <StackItem>
                  <EmptyBiasChartSelectionCard />
                </StackItem>
              )) || (
                <>
                  {selectedBiasConfigs.map((x) => (
                    <StackItem key={x.id}>
                      <DashboardExpandableSection
                        title={x.name}
                        storageKey={`${OPEN_WRAPPER_STORAGE_KEY_PREFIX}-${x.id}`}
                      >
                        <TrustyChart biasMetricConfig={x} />
                      </DashboardExpandableSection>
                    </StackItem>
                  ))}
                </>
              )}
          </Stack>
        </PageSection>
      </Stack>
    </EnsureMetricsAvailable>
  );
};
export default BiasTab;
