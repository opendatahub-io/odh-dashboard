import {
  ActionList,
  ActionListItem,
  Alert,
  Button,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ModelCustomizationFormData } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import useRunFormData from '~/concepts/pipelines/content/createRun/useRunFormData';
import { handleSubmit } from '~/concepts/pipelines/content/createRun/submitUtils';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { isRunSchedule } from '~/concepts/pipelines/utils';
import { globalPipelineRunsRoute } from '~/routes';
import useNotification from '~/utilities/useNotification';
import {
  NotificationWatcherContext,
  NotificationWatcherResponse,
} from '~/concepts/notificationWatcher/NotificationWatcherContext';
import {
  PipelineRecurringRunKF,
  PipelineRunKF,
  RuntimeStateKF,
} from '~/concepts/pipelines/kfTypes';
import { createTeacherJudgeSecrets } from '~/pages/pipelines/global/modelCustomization/utils';

type FineTunePageFooterProps = {
  isInvalid: boolean;
  onSuccess: () => void;
  data: ModelCustomizationFormData;
};

const FineTunePageFooter: React.FC<FineTunePageFooterProps> = ({ isInvalid, onSuccess, data }) => {
  const [error, setError] = React.useState<Error>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { api } = usePipelinesAPI();
  const { registerNotification } = React.useContext(NotificationWatcherContext);
  const notification = useNotification();
  const navigate = useNavigate();
  const { namespace } = usePipelinesAPI();
  const contextPath = globalPipelineRunsRoute(namespace);

  // TODO: translate data to `RunFormData`
  const [runFormData] = useRunFormData(null, {});

  const onSubmit = async (dryRun: boolean) => {
    const [teacherSecret, judgeSecret] = await createTeacherJudgeSecrets(
      namespace,
      data.teacher,
      data.judge,
      dryRun,
    );
    return handleSubmit(
      {
        ...runFormData,
        params: {
          ...runFormData.params,
          /* eslint-disable camelcase */
          teacher_secret: teacherSecret.metadata.name,
          judge_secret: judgeSecret.metadata.name,
          /* eslint-enable camelcase */
        },
      },
      api,
      dryRun,
    );
  };

  const afterSubmit = (resource: PipelineRunKF | PipelineRecurringRunKF) => {
    const runId = isRunSchedule(resource) ? resource.recurring_run_id : resource.run_id;
    notification.info('InstructLab run started', `Run for ${resource.display_name} started`, [
      {
        title: 'View run details',
        onClick: () => {
          navigate(`${contextPath}/${runId}`);
        },
      },
    ]);
    registerNotification({
      callback: (signal: AbortSignal) =>
        api
          .getPipelineRun({ signal }, runId)
          .then((response): NotificationWatcherResponse => {
            if (response.state === RuntimeStateKF.SUCCEEDED) {
              return {
                status: 'success',
                title: `${resource.display_name} successfully completed`,
                message: `Your new model, ${resource.display_name}, is within the model registry`,
                actions: [
                  {
                    title: 'View in model registry',
                    onClick: () => {
                      // TODO: navigate to model registry
                    },
                  },
                ],
              };
            }
            if (response.state === RuntimeStateKF.FAILED) {
              return {
                status: 'error',
                title: `${resource.display_name} has failed`,
                message: `Your run ${resource.display_name} has failed`,
                actions: [
                  {
                    title: 'View run details',
                    onClick: () => {
                      navigate(`${contextPath}/${runId}`);
                    },
                  },
                ],
              };
            }
            if (
              response.state === RuntimeStateKF.RUNNING ||
              response.state === RuntimeStateKF.PENDING
            ) {
              return { status: 'repoll' };
            }
            // Stop on any other state
            return { status: 'stop' };
          })
          .catch((e) => {
            // eslint-disable-next-line no-console
            console.error('Error calling api.getPipelineRun', e);
            return { status: 'stop' };
          }),
    });
  };

  const handleError = (e: Error) => {
    setIsSubmitting(false);
    setError(e);
  };

  return (
    <Stack hasGutter>
      {error && (
        <StackItem>
          <Alert isInline variant="danger" title="Error starting InstructLab run ">
            {error.message}
          </Alert>
        </StackItem>
      )}
      <StackItem>
        <ActionList>
          <ActionListItem>
            <Button
              variant="primary"
              data-testid="model-customization-submit-button"
              isDisabled={isInvalid || isSubmitting}
              onClick={() => {
                setError(undefined);
                setIsSubmitting(true);
                onSubmit(true)
                  .then(() =>
                    onSubmit(false)
                      .then((resource) => {
                        afterSubmit(resource);
                        setIsSubmitting(false);
                        onSuccess();
                      })
                      .catch(handleError),
                  )
                  .catch(handleError);
              }}
              isLoading={isSubmitting}
            >
              Start run
            </Button>
          </ActionListItem>
          <ActionListItem>
            <Button
              variant="link"
              onClick={() => {
                navigate('/modelCustomization');
              }}
            >
              Cancel
            </Button>
          </ActionListItem>
        </ActionList>
      </StackItem>
    </Stack>
  );
};

export default FineTunePageFooter;
