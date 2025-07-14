import React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  PageSection,
  Spinner,
  Stack,
  StackItem,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import MetricsPageToolbar from '#~/concepts/metrics/MetricsPageToolbar';
import BiasMetricConfigSelector from '#~/pages/modelServing/screens/metrics/bias/BiasMetricConfigSelector';
import { useModelBiasData } from '#~/concepts/trustyai/context/useModelBiasData';
import BiasChart from '#~/pages/modelServing/screens/metrics/bias/BiasChart';
import EmptyBiasConfigurationCard from '#~/pages/modelServing/screens/metrics/bias/BiasConfigurationPage/EmptyBiasConfigurationCard';
import EmptyBiasChartSelectionCard from '#~/pages/modelServing/screens/metrics/bias/EmptyBiasChartSelectionCard';
import DashboardExpandableSection from '#~/concepts/dashboard/DashboardExpandableSection';
import useBiasChartSelections from '#~/pages/modelServing/screens/metrics/bias/useBiasChartSelections';
import { ModelMetricType } from '#~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import EnsureMetricsAvailable from '#~/pages/modelServing/screens/metrics/EnsureMetricsAvailable';
import { TrustyInstallState } from '#~/concepts/trustyai/types';

const OPEN_WRAPPER_STORAGE_KEY_PREFIX = `odh.dashboard.xai.bias_metric_chart_wrapper_open`;
const BiasTab: React.FC = () => {
  const { biasMetricConfigs, statusState } = useModelBiasData();

  const [selectedBiasConfigs, setSelectedBiasConfigs, settled] =
    useBiasChartSelections(biasMetricConfigs);

  const ready = statusState.type === TrustyInstallState.INSTALLED && settled;

  if (statusState.type === TrustyInstallState.CR_ERROR) {
    return (
      <PageSection hasBodyWrapper={false} isFilled>
        <EmptyState
          headingLevel="h5"
          icon={ExclamationCircleIcon}
          titleText="TrustyAI Error"
          variant={EmptyStateVariant.lg}
        >
          <EmptyStateBody>
            <Stack hasGutter>
              <StackItem>We encountered an error accessing the TrustyAI service:</StackItem>
              <StackItem>{statusState.message}</StackItem>
            </Stack>
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  if (!ready) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <EnsureMetricsAvailable
      metrics={[ModelMetricType.TRUSTY_AI_SPD, ModelMetricType.TRUSTY_AI_DIR]}
      accessDomain="model bias metrics"
    >
      <Stack data-testid="bias-metrics-loaded">
        <StackItem>
          <MetricsPageToolbar
            leftToolbarItem={
              biasMetricConfigs.length > 0 ? (
                <ToolbarGroup>
                  <Stack>
                    {/* Will be fixed by https://issues.redhat.com/browse/RHOAIENG-2403 */}
                    <StackItem style={{ fontWeight: 'bold' }}>Metrics to display</StackItem>
                    <StackItem>
                      <ToolbarItem data-testid="bias-metric-config-toolbar">
                        <BiasMetricConfigSelector
                          onChange={setSelectedBiasConfigs}
                          initialSelections={selectedBiasConfigs}
                        />
                      </ToolbarItem>
                    </StackItem>
                  </Stack>
                </ToolbarGroup>
              ) : undefined
            }
          />
        </StackItem>
        <PageSection hasBodyWrapper={false} isFilled>
          <Stack hasGutter>
            {biasMetricConfigs.length === 0 ? (
              <StackItem>
                <EmptyBiasConfigurationCard />
              </StackItem>
            ) : selectedBiasConfigs.length === 0 ? (
              <StackItem>
                <EmptyBiasChartSelectionCard />
              </StackItem>
            ) : (
              <>
                {selectedBiasConfigs.map((x) => (
                  <StackItem key={x.id}>
                    <DashboardExpandableSection
                      title={x.name}
                      storageKey={`${OPEN_WRAPPER_STORAGE_KEY_PREFIX}-${x.id}`}
                      data-testid={`expandable-section-${x.name}`}
                    >
                      <BiasChart biasMetricConfig={x} />
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
