import * as React from 'react';
import { Alert, Button, Content, Stack, StackItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import ProjectSelectorNavigator from '#~/concepts/projects/ProjectSelectorNavigator';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { MLFLOW_EXPERIMENTS_ROUTE } from '#~/routes/pipelines/mlflowExperiments';
import { SupportedArea } from '#~/concepts/areas/types';
import useIsAreaAvailable from '#~/concepts/areas/useIsAreaAvailable';

type PipelineCoreProjectSelectorProps = {
  getRedirectPath: (namespace: string) => string;
  queryParamNamespace?: string;
  objectType?: ProjectObjectType;
};

const PipelineCoreProjectSelector: React.FC<PipelineCoreProjectSelectorProps> = ({
  getRedirectPath,
  queryParamNamespace,
  objectType,
}) => {
  const navigate = useNavigate();
  const isMLflowEnabled = useIsAreaAvailable(SupportedArea.MLFLOW).status;

  return (
    <Stack hasGutter>
      {objectType === ProjectObjectType.pipelineExperiment && isMLflowEnabled && (
        <StackItem>
          <Alert
            variant="warning"
            isInline
            title="This page is being deprecated"
            data-testid="pipeline-experiment-deprecated-alert"
          >
            <Content component="p" style={{ maxWidth: '620px' }}>
              We've updated Experiments with MLflow integration for a better tracking experience. To
              manage your runs, go to the new{' '}
              <Button
                data-testid="embedded-mlflow-experiments-link"
                variant="link"
                isInline
                onClick={() => navigate(MLFLOW_EXPERIMENTS_ROUTE)}
              >
                <strong>Experiments page</strong>
              </Button>
              .
            </Content>
          </Alert>
        </StackItem>
      )}
      <StackItem>
        <ProjectSelectorNavigator
          getRedirectPath={getRedirectPath}
          queryParamNamespace={queryParamNamespace}
          showTitle
        />
      </StackItem>
    </Stack>
  );
};

export default PipelineCoreProjectSelector;
