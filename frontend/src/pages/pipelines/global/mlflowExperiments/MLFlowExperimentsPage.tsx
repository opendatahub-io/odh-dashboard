import React from 'react';
import { Button, Flex, FlexItem } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { mlflowJumpLinkUrl } from '#~/routes/pipelines/mlflowExperiments';
import MLflowIframeCSSOverride from './MLflowIframeCSSOverride';
import MlflowIframe from './MLflowIframe';

const GlobalMLflowExperimentsPage: React.FC = () => {
  return (
    <ApplicationsPage
      loaded
      empty={false}
      provideChildrenPadding
      removeChildrenTopPadding
      title="Experiments"
      keepBodyWrapper={false}
    >
      <Flex justifyContent={{ default: 'justifyContentFlexEnd' }}>
        <FlexItem>
          <Button
            component="a"
            isInline
            data-testid="mlflow-embedded-jump-link"
            href={mlflowJumpLinkUrl}
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
};

export default GlobalMLflowExperimentsPage;
