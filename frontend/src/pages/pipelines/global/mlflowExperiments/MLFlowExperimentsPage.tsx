import React from 'react';
import { Button, Flex, FlexItem } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import PipelineCoreProjectSelector from '#~/pages/pipelines/global/PipelineCoreProjectSelector';
import {
  mlflowExperimentsBaseRoute,
  WORKSPACE_QUERY_PARAM,
  MLFLOW_PROXY_BASE_PATH,
} from '#~/routes/pipelines/mlflowExperiments';
import MLflowIframeCSSOverride from './MLflowIframeCSSOverride';
import MlflowIframe from './MLflowIframe';

const GlobalMLflowExperimentsPage: React.FC = () => (
  <ApplicationsPage
    loaded
    empty={false}
    title="MLflow Experiments"
    headerContent={
      <PipelineCoreProjectSelector
        getRedirectPath={mlflowExperimentsBaseRoute}
        queryParamNamespace={WORKSPACE_QUERY_PARAM}
      />
    }
    provideChildrenPadding
    removeChildrenTopPadding
    keepBodyWrapper={false}
  >
    <Flex justifyContent={{ default: 'justifyContentFlexEnd' }}>
      <FlexItem>
        <Button
          component="a"
          isInline
          data-testid="mlflow-embedded-jump-link"
          href={MLFLOW_PROXY_BASE_PATH}
          target="_blank"
          variant="link"
          icon={<ExternalLinkAltIcon />}
          iconPosition="end"
          aria-label="Launch MLflow"
        >
          Launch MLflow
        </Button>
      </FlexItem>
    </Flex>
    <MLflowIframeCSSOverride>
      {(iframeRef) => <MlflowIframe ref={iframeRef} />}
    </MLflowIframeCSSOverride>
  </ApplicationsPage>
);

export default GlobalMLflowExperimentsPage;
