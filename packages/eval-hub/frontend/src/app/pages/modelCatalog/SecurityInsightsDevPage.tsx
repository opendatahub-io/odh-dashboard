// TODO: remove when extension wiring is complete (RHOAIENG-67399)
import * as React from 'react';
import { PageSection } from '@patternfly/react-core';
import SecurityInsightsView from './SecurityInsightsView';

// Hard-coded values matching the BFF mock data
const DEV_SOURCE_ID = 'sample-source';
const DEV_MODEL_NAME = 'repo1/granite-8b-code-instruct';
const DEV_NAMESPACE = 'kubeflow';

const SecurityInsightsDevPage: React.FC = () => (
  <PageSection>
    <SecurityInsightsView
      sourceId={DEV_SOURCE_ID}
      modelName={DEV_MODEL_NAME}
      namespace={DEV_NAMESPACE}
    />
  </PageSection>
);

export default SecurityInsightsDevPage;
