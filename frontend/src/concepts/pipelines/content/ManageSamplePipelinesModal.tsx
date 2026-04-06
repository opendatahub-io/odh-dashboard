import React from 'react';
import {
  Alert,
  Stack,
  StackItem,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  Checkbox,
} from '@patternfly/react-core';
import { getPipelinesCR, toggleInstructLabState } from '#~/api';
import DashboardModalFooter from '#~/concepts/dashboard/DashboardModalFooter';
import {
  NotificationResponseStatus,
  NotificationWatcherContext,
  NotificationWatcherResponse,
} from '#~/concepts/notificationWatcher/NotificationWatcherContext';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { ILAB_PIPELINE_NAME } from '#~/pages/pipelines/global/modelCustomization/const';
import useNotification from '#~/utilities/useNotification';

type ManageSamplePipelinesModalProps = {
  onClose: () => void;
};

const ilabPipelineNotificationWatcher = Symbol('ilab-pipeline-notification-watcher');

const ManageSamplePipelinesModal: React.FC<ManageSamplePipelinesModalProps> = ({ onClose }) => {
  const [error, setError] = React.useState<Error>();
  const {
    api,
    pipelinesServer: { name: dspaName },
    refreshState,
    namespace,
    managedPipelines,
    refreshAllAPI,
  } = usePipelinesAPI();
  const [isSubmitting, setSubmitting] = React.useState(false);
  const isInstructLabEnabled =
    managedPipelines &&
    'instructLab' in managedPipelines &&
    managedPipelines.instructLab != null &&
    typeof managedPipelines.instructLab === 'object' &&
    'state' in managedPipelines.instructLab &&
    managedPipelines.instructLab.state === 'Managed';
  const [checked, setChecked] = React.useState(isInstructLabEnabled);
  const instructLabStatus: {
    instructLab?: {
      state: 'Removed' | 'Managed';
    };
  } = {
    instructLab: { state: checked ? 'Managed' : 'Removed' },
  };
  const notification = useNotification();
  const { registerNotification, unregisterNotification } = React.useContext(
    NotificationWatcherContext,
  );

  // Use this ref to avoid creating duplicated notification watcher when toggling the enablement quickly
  const notificationWatcherRef = React.useRef(false);

  const onSubmit = () => {
    setError(undefined);
    setSubmitting(true);
    toggleInstructLabState(
      namespace,
      dspaName,
      // This field is optional, so we need to patch the whole object to avoid 422 error
      managedPipelines ? { ...managedPipelines, ...instructLabStatus } : instructLabStatus,
    )
      .then((dspa) => {
        const managedPipelinesResult = dspa.spec.apiServer?.managedPipelines;
        const isEnabled =
          managedPipelinesResult != null &&
          'instructLab' in managedPipelinesResult &&
          managedPipelinesResult.instructLab != null &&
          typeof managedPipelinesResult.instructLab === 'object' &&
          'state' in managedPipelinesResult.instructLab &&
          managedPipelinesResult.instructLab.state === 'Managed';
        if (isEnabled) {
          notification.info('Restarting pipeline server');
        } else {
          notification.success('Automatic updates for InstructLab pipeline disabled');
        }
        unregisterNotification(ilabPipelineNotificationWatcher);
        if (isEnabled && !notificationWatcherRef.current) {
          notificationWatcherRef.current = true;
          registerNotification({
            id: ilabPipelineNotificationWatcher,
            callback: (signal: AbortSignal) =>
              // Check both InstructLab pipeline and pipeline server
              Promise.all([
                api.getPipelineByName({ signal }, ILAB_PIPELINE_NAME),
                getPipelinesCR(namespace, dspaName, { signal }),
              ])
                .then(([iLabPipelineResponse, dspaResponse]): NotificationWatcherResponse => {
                  const iLabPipelineReady =
                    !!iLabPipelineResponse.pipeline_id && !iLabPipelineResponse.error;
                  const serverReady = !!dspaResponse.status?.conditions?.find(
                    (c) => c.type === 'APIServerReady' && c.status === 'True',
                  );
                  const title = `InstructLab pipeline installed on ${namespace} project`;
                  if (iLabPipelineReady && serverReady) {
                    notificationWatcherRef.current = false;
                    // Refresh the pipelines list to make the ilab pipeline shown
                    refreshAllAPI();
                    return {
                      status: NotificationResponseStatus.SUCCESS,
                      title,
                    };
                  }
                  if (iLabPipelineResponse.error) {
                    notificationWatcherRef.current = false;
                    return {
                      status: NotificationResponseStatus.ERROR,
                      title: 'Error enabling InstructLab pipeline',
                      message: iLabPipelineResponse.error.message,
                    };
                  }
                  if (!serverReady) {
                    // re-poll only if the server is not ready
                    return { status: NotificationResponseStatus.REPOLL };
                  }
                  return { status: NotificationResponseStatus.STOP };
                })
                // e.g. 404 error when InstructLab pipeline is not ready, we keep re-polling it
                .catch(() => ({ status: NotificationResponseStatus.REPOLL })),
            callbackDelay: 10000,
          });
        }
        refreshState();
        onClose();
      })
      .catch((e) => setError(e))
      .finally(() => setSubmitting(false));
  };

  return (
    <Modal
      isOpen
      variant="small"
      onClose={() => onClose()}
      data-testid="manage-sample-pipelines-modal"
    >
      <ModalHeader
        title="Manage preconfigured pipelines"
        description={
          <>
            Select a preconfigured pipeline to install it on your project and enable automatic
            updates. After installation, you can deselect the pipeline to disable automatic updates.
            <br />
            <br />
            Note: You can manually delete preconfigured pipelines after installation.
          </>
        }
      />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Checkbox
              id="instructlab-pipeline-checkbox"
              label="InstructLab pipeline"
              isChecked={checked}
              onChange={(_event, isChecked) => setChecked(isChecked)}
            />
          </StackItem>
          {!isInstructLabEnabled && checked ? (
            <StackItem>
              <Alert
                isInline
                variant="warning"
                title="Installing the InstructLab pipeline will cause the pipeline server to restart."
              />
            </StackItem>
          ) : null}
          {isInstructLabEnabled && !checked ? (
            <StackItem>
              <Alert
                isInline
                variant="warning"
                title="If you want to remove the InstructLab pipeline, you must manually delete it."
              />
            </StackItem>
          ) : null}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          onCancel={() => onClose()}
          onSubmit={onSubmit}
          submitLabel="Apply"
          isSubmitLoading={isSubmitting}
          isSubmitDisabled={checked === isInstructLabEnabled}
          error={error}
          alertTitle="Error managing sample pipelines"
        />
      </ModalFooter>
    </Modal>
  );
};

export default ManageSamplePipelinesModal;
