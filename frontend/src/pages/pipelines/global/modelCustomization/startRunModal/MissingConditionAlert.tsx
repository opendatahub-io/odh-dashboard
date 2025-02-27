import * as React from 'react';
import { Alert, AlertProps, Button, Stack, StackItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import {
  useContinueState,
  ContinueCondition,
} from '~/pages/pipelines/global/modelCustomization/startRunModal/useContinueState';

type MissingConditionAlertProps = {
  selectedProject: string;
  setIsLoadingProject: (isLoading: boolean) => void;
  setCanContinue: (canContinue: boolean) => void;
};

type PickedAlertProps = Pick<AlertProps, 'variant' | 'children' | 'title'>;

const ALERT_CONFIG: Record<ContinueCondition, PickedAlertProps> = {
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
  selectedProject,
  setIsLoadingProject,
  setCanContinue,
}) => {
  const navigate = useNavigate();
  const [alertProps, setAlertProps] = React.useState<PickedAlertProps | null>(null);
  const continueState = useContinueState();

  React.useEffect(() => {
    setAlertProps(null);
    setCanContinue(continueState.canContinue);
    setIsLoadingProject(continueState.isLoading);

    if (continueState.isLoading) {
      return;
    }

    if (!continueState.canContinue) {
      setAlertProps(ALERT_CONFIG[continueState.unmetCondition]);
    }
  }, [continueState, setCanContinue, setIsLoadingProject]);

  return (
    alertProps && (
      <Alert
        isInline
        variant={alertProps.variant}
        title={alertProps.title}
        data-testid="missing-condition-alert"
      >
        <Stack hasGutter>
          <StackItem>{alertProps.children}</StackItem>
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
    )
  );
};

export default MissingConditionAlert;
