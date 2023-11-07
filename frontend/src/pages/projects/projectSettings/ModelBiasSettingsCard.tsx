import {
  Alert,
  AlertActionCloseButton,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import React from 'react';
import InstallTrustyAICheckbox, {
  TrustyAICRActions,
} from '~/concepts/explainability/content/InstallTrustyAICheckbox';

type ModelBiasSettingsCardProps = {
  namespace: string;
};
const ModelBiasSettingsCard: React.FC<ModelBiasSettingsCardProps> = ({ namespace }) => {
  const [notifyAction, setNotifyAction] = React.useState<TrustyAICRActions | undefined>(undefined);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>(undefined);

  const clearNotification = React.useCallback(() => {
    setNotifyAction(undefined);
    setSuccess(false);
    setError(undefined);
  }, []);

  const renderNotification = () => {
    if (success && notifyAction === TrustyAICRActions.CREATE) {
      return (
        <Alert
          variant="success"
          title="TrustyAI installed"
          actionClose={<AlertActionCloseButton onClose={clearNotification} />}
          isLiveRegion
          isInline
        >
          The TrustyAI service was successfully installed
        </Alert>
      );
    }

    if (!success && notifyAction === TrustyAICRActions.CREATE) {
      return (
        <Alert
          variant="danger"
          title="TrustyAI installation error"
          actionClose={<AlertActionCloseButton onClose={clearNotification} />}
          isLiveRegion
          isInline
        >
          {error?.message}
        </Alert>
      );
    }

    if (success && notifyAction === TrustyAICRActions.DELETE) {
      return (
        <Alert
          variant="success"
          title="TrustyAI uninstalled"
          actionClose={<AlertActionCloseButton onClose={clearNotification} />}
          isLiveRegion
          isInline
        >
          The TrustyAI service was successfully uninstalled
        </Alert>
      );
    }

    if (!success && notifyAction === TrustyAICRActions.DELETE) {
      return (
        <Alert
          variant="danger"
          title="TrustyAI uninstallation error"
          actionClose={<AlertActionCloseButton onClose={clearNotification} />}
          isLiveRegion
          isInline
        >
          {error?.message}
        </Alert>
      );
    }

    return null;
  };

  return (
    <Card isFlat>
      <CardHeader>
        <CardTitle>Model Bias</CardTitle>
      </CardHeader>
      <CardBody>
        <Stack>
          <StackItem>
            <InstallTrustyAICheckbox
              namespace={namespace}
              onAction={(action, success, error) => {
                setNotifyAction(action);
                setSuccess(success);
                setError(error);
              }}
            />
          </StackItem>
        </Stack>
      </CardBody>
      <CardFooter>{renderNotification()}</CardFooter>
    </Card>
  );
};

export default ModelBiasSettingsCard;
