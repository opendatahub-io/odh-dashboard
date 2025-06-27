import { Tab, TabTitleText, PageSection } from '@patternfly/react-core';
import * as React from 'react';
import type { ModelVersionRegisteredDeploymentsViewProps } from '@odh-dashboard/model-registry/extension-points';
import ModelVersionRegisteredDeploymentsView from '../../../../model-registry/upstream/frontend/src/app/pages/modelRegistry/screens/ModelVersionDetails/ModelVersionRegisteredDeploymentsView';

const DeploymentsTab: React.FC<ModelVersionRegisteredDeploymentsViewProps> = ({
  inferenceServices,
  servingRuntimes,
  refresh,
}) => (
  <Tab
    eventKey="deployments"
    title={<TabTitleText>Deployments</TabTitleText>}
    aria-label="Deployments tab"
    data-testid="deployments-tab"
  >
    <PageSection hasBodyWrapper={false} isFilled data-testid="deployments-tab-content">
      <ModelVersionRegisteredDeploymentsView
        inferenceServices={inferenceServices}
        servingRuntimes={servingRuntimes}
        refresh={refresh}
      />
    </PageSection>
  </Tab>
);

export default DeploymentsTab;
