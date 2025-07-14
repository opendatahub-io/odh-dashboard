import {
  ActionList,
  ActionListItem,
  Alert,
  Button,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { ModelCustomizationFormData } from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import useRunFormData from '#~/concepts/pipelines/content/createRun/useRunFormData';
import { handleSubmit } from '#~/concepts/pipelines/content/createRun/submitUtils';
import { isRunSchedule } from '#~/concepts/pipelines/utils';
import { globalPipelineRunDetailsRoute, globalPipelineRunsRoute } from '#~/routes/pipelines/runs';
import {
  modelCustomizationRootPath,
  ModelCustomizationRouterState,
} from '#~/routes/pipelines/modelCustomization';
import { modelVersionRoute } from '#~/routes/modelRegistry/modelVersions';
import useNotification from '#~/utilities/useNotification';
import {
  NotificationResponseStatus,
  NotificationWatcherContext,
  NotificationWatcherResponse,
} from '#~/concepts/notificationWatcher/NotificationWatcherContext';
import {
  PipelineKF,
  PipelineRecurringRunKF,
  PipelineRunKF,
  PipelineVersionKF,
  RuntimeStateKF,
} from '#~/concepts/pipelines/kfTypes';
import {
  createTeacherJudgeSecrets,
  createTaxonomySecret,
  createConnectionSecret,
  translateIlabForm,
} from '#~/pages/pipelines/global/modelCustomization/utils';
import { genRandomChars } from '#~/utilities/string';
import { RunTypeOption } from '#~/concepts/pipelines/content/createRun/types';
import { ValidationContext } from '#~/utilities/useValidation';
import { FineTunedModelNewConnectionContext } from '#~/pages/pipelines/global/modelCustomization/fineTunedModelSection/FineTunedModelNewConnectionContext';
import { InferenceServiceStorageType } from '#~/pages/modelServing/screens/types';
import { ConnectionTypeConfigMapObj } from '#~/concepts/connectionTypes/types';
import { deleteSecret } from '#~/api';
import { isFilledRunFormData } from '#~/concepts/pipelines/content/createRun/utils';
import { GetArtifactsRequest } from '#~/third_party/mlmd';
import { ListOperationOptions } from '#~/third_party/mlmd/generated/ml_metadata/proto/metadata_store_pb';
import { getArtifactModelData } from '#~/concepts/pipelines/content/pipelinesDetails/pipelineRun/artifacts/utils';

type FineTunePageFooterProps = {
  canSubmit: boolean;
  onSuccess: (runId: string, runType: RunTypeOption) => void;
  data: ModelCustomizationFormData;
  ilabPipeline: PipelineKF | null;
  ilabPipelineVersion: PipelineVersionKF | null;
  ociConnectionType?: ConnectionTypeConfigMapObj;
};

type FineTunePageFooterSubmitPresetValues = {
  teacherSecretName?: string;
  judgeSecretName?: string;
  taxonomySecretName?: string;
  connectionSecretName?: string;
};

const FineTunePageFooter: React.FC<FineTunePageFooterProps> = ({
  canSubmit,
  onSuccess,
  data,
  ilabPipeline,
  ilabPipelineVersion,
  ociConnectionType,
}) => {
  const [error, setError] = React.useState<Error>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { api, namespace, metadataStoreServiceClient } = usePipelinesAPI();
  const { registerNotification } = React.useContext(NotificationWatcherContext);
  const notification = useNotification();
  const navigate = useNavigate();
  const { state }: { state?: ModelCustomizationRouterState } = useLocation();
  const contextPath = globalPipelineRunsRoute(namespace);
  const {
    isValid: isNewConnectionFieldValid,
    nameDescData,
    connectionValues,
  } = React.useContext(FineTunedModelNewConnectionContext);

  const { validationResult } = React.useContext(ValidationContext);
  const isValid =
    data.outputModel.connectionData.type === InferenceServiceStorageType.NEW_STORAGE
      ? validationResult.success && isNewConnectionFieldValid
      : validationResult.success;

  const [runFormData] = useRunFormData(null, {
    nameDesc: {
      name: `lab-${genRandomChars()}`,
      description: '',
    },
    runType: { type: RunTypeOption.ONE_TRIGGER },
    pipeline: ilabPipeline,
    version: ilabPipelineVersion,
  });

  const onSubmit = async (dryRun: boolean, presetValues?: FineTunePageFooterSubmitPresetValues) => {
    const { teacherSecretName, judgeSecretName, taxonomySecretName } = presetValues || {};
    const [teacherSecret, judgeSecret] = await createTeacherJudgeSecrets(
      namespace,
      data.teacher,
      data.judge,
      dryRun,
      teacherSecretName,
      judgeSecretName,
    );

    const taxonomySecret = await createTaxonomySecret(
      data.taxonomy,
      namespace,
      dryRun,
      taxonomySecretName,
    );

    let connectionSecretName;
    if (data.outputModel.connectionData.type === InferenceServiceStorageType.NEW_STORAGE) {
      const newConnectionSecret = await createConnectionSecret(
        namespace,
        nameDescData,
        connectionValues,
        ociConnectionType,
        dryRun,
      );
      connectionSecretName = newConnectionSecret.metadata.name;
    } else {
      connectionSecretName = data.outputModel.connectionData.connection;
    }

    return { connectionSecretName, teacherSecret, judgeSecret, taxonomySecret };
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
          .then(async (response): Promise<NotificationWatcherResponse> => {
            if (response.state === RuntimeStateKF.SUCCEEDED) {
              // fetch the model artifact
              const request = new GetArtifactsRequest();
              const options = new ListOperationOptions();

              options.setFilterQuery(`contexts_a.name = '${runId}'`);
              request.setOptions(options);

              const artifactsResponse = await metadataStoreServiceClient.getArtifacts(request);
              const artifacts = artifactsResponse.getArtifactsList();
              const model = artifacts
                .map((artifact) => getArtifactModelData(artifact))
                .find((m) => m.registeredModelName);

              if (
                model &&
                model.modelVersionId &&
                model.registeredModelId &&
                model.modelRegistryName
              ) {
                return {
                  status: NotificationResponseStatus.SUCCESS,
                  title: `${resource.display_name} successfully completed`,
                  message: `Your new model, ${resource.display_name}, is within the model registry`,
                  actions: [
                    {
                      title: 'View in model registry',
                      onClick: () => {
                        navigate(
                          modelVersionRoute(
                            model.modelVersionId ?? '',
                            model.registeredModelId,
                            model.modelRegistryName,
                          ),
                        );
                      },
                    },
                  ],
                };
              }

              return {
                status: NotificationResponseStatus.SUCCESS,
                title: `${resource.display_name} successfully completed`,
                message: `Your run ${resource.display_name} has successfully completed`,
                actions: [
                  {
                    title: 'View run details',
                    onClick: () => {
                      navigate(globalPipelineRunDetailsRoute(namespace, runId));
                    },
                  },
                ],
              };
            }
            if (response.state === RuntimeStateKF.FAILED) {
              return {
                status: NotificationResponseStatus.ERROR,
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
              return { status: NotificationResponseStatus.REPOLL };
            }
            // Stop on any other state
            return { status: NotificationResponseStatus.STOP };
          })
          .catch((e) => {
            // eslint-disable-next-line no-console
            console.error('Error calling api.getPipelineRun', e);
            return { status: NotificationResponseStatus.STOP };
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
              isDisabled={!isValid || isSubmitting || !canSubmit}
              onClick={() => {
                setError(undefined);
                setIsSubmitting(true);
                // dry-run network calls first
                onSubmit(true)
                  .then(({ teacherSecret, judgeSecret, taxonomySecret, connectionSecretName }) =>
                    // get the dry-run values and do the real network calls
                    onSubmit(false, {
                      teacherSecretName: teacherSecret.metadata.name,
                      judgeSecretName: judgeSecret.metadata.name,
                      taxonomySecretName: taxonomySecret.metadata.name,
                    })
                      .then(async () => {
                        const runFormDataWithParams = {
                          ...runFormData,
                          params: {
                            ...runFormData.params,
                            ...translateIlabForm(
                              data,
                              teacherSecret.metadata.name,
                              judgeSecret.metadata.name,
                              taxonomySecret.metadata.name,
                              connectionSecretName,
                            ),
                          },
                        };
                        if (!isFilledRunFormData(runFormDataWithParams)) {
                          throw new Error('Form data was incomplete.');
                        }
                        await handleSubmit(runFormDataWithParams, api)
                          .then((run) => {
                            afterSubmit(run);
                            setIsSubmitting(false);
                            if (isRunSchedule(run)) {
                              onSuccess(run.recurring_run_id, RunTypeOption.SCHEDULED);
                            } else {
                              onSuccess(run.run_id, RunTypeOption.ONE_TRIGGER);
                            }
                          })
                          .catch(async (e) => {
                            handleError(e);

                            // delete created secrets
                            await deleteSecret(namespace, teacherSecret.metadata.name);
                            await deleteSecret(namespace, judgeSecret.metadata.name);
                            await deleteSecret(namespace, taxonomySecret.metadata.name);

                            if (
                              data.outputModel.connectionData.type ===
                                InferenceServiceStorageType.NEW_STORAGE &&
                              connectionSecretName
                            ) {
                              await deleteSecret(namespace, connectionSecretName);
                            }
                          });
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
              data-testid="model-customization-cancel-button"
              onClick={() => {
                if (
                  state &&
                  state.modelVersionId &&
                  state.registeredModelId &&
                  state.modelRegistryName
                ) {
                  navigate(
                    modelVersionRoute(
                      state.modelVersionId,
                      state.registeredModelId,
                      state.modelRegistryName,
                    ),
                  );
                } else {
                  navigate(modelCustomizationRootPath);
                }
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
