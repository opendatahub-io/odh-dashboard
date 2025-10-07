import * as React from 'react';
import { Alert, AlertProps, Button, Stack, StackItem } from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import {
  useContinueState,
  ContinueCondition,
} from '#~/pages/pipelines/global/modelCustomization/startRunModal/useContinueState';

type MissingConditionAlertProps = {
  selectedProject: string;
  setIsLoadingProject: (isLoading: boolean) => void;
  setCanContinue: (canContinue: boolean) => void;
};

type PickedAlertProps = Pick<AlertProps, 'variant' | 'children' | 'title'>;

const ALERT_CONFIG: Record<ContinueCondition, PickedAlertProps> = {
  ilabPipelineInstalled: {
    variant: 'danger',
    title: 'InstructLab pipeline not installed',
    children:
      'To start a LAB-tuning run, the InstructLab pipeline must exist in the selected project. Install the InstructLab pipeline on your project, or select a different project.',
  },
  pipelineServerConfigured: {
    variant: 'danger',
    title: 'Pipeline server not configured',
    children:
      'To start a LAB-tuning run, the selected project must have a configured pipeline server and an InstructLab pipeline installed. Configure the server and install the pipeline, or select a different project.',
  },
  pipelineServerAccessible: {
    variant: 'danger',
    title: 'Pipeline server not accessible',
    children:
      'To start a LAB-tuning run, the selected project must have a configured pipeline server that is online, and an InstructLab pipeline installed. Ensure the server is online and install the pipeline, or select a different project.',
  },
  pipelineServerOnline: {
    variant: 'danger',
    title: 'Pipeline server is offline',
    children: 'To start a LAB-tuning run, you must first start this project’s pipeline server.',
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
              onClick={() => navigate(`/develop-train/pipelines/definitions/${selectedProject}`)}
            >
              Go to <b>Pipeline definitions</b>
            </Button>
          </StackItem>
        </Stack>
      </Alert>
    )
  );
};

export default MissingConditionAlert;
