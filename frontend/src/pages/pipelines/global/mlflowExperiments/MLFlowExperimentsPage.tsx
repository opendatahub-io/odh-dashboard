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
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { experimentsPageTitle } from '#~/pages/pipelines/global/experiments/const';
import { fireLinkTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import MlflowIframe from './MLflowIframe';

const GlobalMLflowExperimentsPage: React.FC = () => (
  <ApplicationsPage
    loaded
    empty={false}
    title={
      <TitleWithIcon
        title={experimentsPageTitle}
        objectType={ProjectObjectType.pipelineExperiment}
      />
    }
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
          onClick={() =>
            fireLinkTrackingEvent('Launch MLflow clicked', {
              from: window.location.pathname,
              href: MLFLOW_PROXY_BASE_PATH,
              section: 'experiments-page',
            })
          }
        >
          Launch MLflow
        </Button>
      </FlexItem>
    </Flex>
    <MlflowIframe />
  </ApplicationsPage>
);

export default GlobalMLflowExperimentsPage;
