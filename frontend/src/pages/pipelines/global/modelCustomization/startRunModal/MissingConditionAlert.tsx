import * as React from 'react';
import { Alert, AlertProps, Button, Stack, StackItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { ContinueCondition } from '~/pages/pipelines/global/modelCustomization/startRunModal/types';

type MissingConditionAlertProps = {
  missingCondition: ContinueCondition;
  selectedProject: string;
};

const ALERT_CONFIG: Record<
  ContinueCondition,
  Pick<AlertProps, 'variant' | 'children' | 'title'>
> = {
  ilabPipelineInstalled: {
    variant: 'warning',
    title: 'InstructLab pipeline not installed',
    children:
      'This project is missing an InstructLab pipeline. You can import the InstructLab pipeline into your project.',
  },
  pipelineServerConfigured: {
    variant: 'warning',
    title: 'Pipeline server not configured',
    children:
      'To utilize InstructLab fine-tuning you need a pipeline server configured with an InstructLab pipeline.',
  },
  pipelineServerAccessible: {
    variant: 'danger',
    title: 'Pipeline server not accessible',
    children:
      'The pipeline server is not accessible. To utilize InstructLab fine-tuning you need a pipeline server configured and online with an InstructLab pipeline.',
  },
  pipelineServerOnline: {
    variant: 'danger',
    title: 'Pipeline server is offline',
    children:
      'The pipeline server is offline. To utilize InstructLab fine-tuning you need to start the server.',
  },
};

const MissingConditionAlert: React.FC<MissingConditionAlertProps> = ({
  missingCondition: condition,
  selectedProject,
}) => {
  const navigate = useNavigate();
  const config = ALERT_CONFIG[condition];

  return (
    <Alert isInline variant={config.variant} title={config.title}>
      <Stack hasGutter>
        <StackItem>{config.children}</StackItem>
        <StackItem>
          <Button
            data-testid="go-to-pipelines"
            variant="link"
            isInline
            component="a"
            onClick={() => navigate(`/pipelines/${selectedProject}`)}
          >
            Go to pipelines
          </Button>
        </StackItem>
      </Stack>
    </Alert>
  );
};

export default MissingConditionAlert;
