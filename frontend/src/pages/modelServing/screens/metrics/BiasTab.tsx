import React from 'react';
import { PageSection, Stack, StackItem } from '@patternfly/react-core';
import { useExplainabilityModelData } from '~/concepts/explainability/useExplainabilityModelData';
import DIRGraph from './DIRChart';
import MetricsPageToolbar from './MetricsPageToolbar';
import SPDChart from './SPDChart';
import EmptyBiasConfigurationCard from './EmptyBiasConfigurationCard';

const BiasTab = () => {
  const { biasMetricConfigs } = useExplainabilityModelData();
  return (
    <Stack>
      <StackItem>
        <MetricsPageToolbar />
      </StackItem>
      <PageSection isFilled>
        <Stack hasGutter>
          {biasMetricConfigs.length === 0 ? (
            <StackItem>
              <EmptyBiasConfigurationCard />
            </StackItem>
          ) : (
            <>
              <StackItem>
                <SPDChart />
              </StackItem>
              <StackItem>
                <DIRGraph />
              </StackItem>
            </>
          )}
        </Stack>
      </PageSection>
    </Stack>
  );
};

export default BiasTab;
