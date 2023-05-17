import * as React from 'react';
import { Icon, List, ListItem, Stack, StackItem, Text, Tooltip } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon, PendingIcon } from '@patternfly/react-icons';
import DeleteModal from '~/pages/projects/components/DeleteModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineCoreResourceKF } from '~/concepts/pipelines/kfTypes';
import { K8sAPIOptions } from '~/k8sTypes';
import useNotification from '~/utilities/useNotification';

type DeletePipelineCoreResourceModalProps = {
  type: 'triggered run' | 'scheduled run' | 'pipeline';
  toDeleteResources: PipelineCoreResourceKF[];
  onClose: (deleted?: boolean) => void;
};

const DeletePipelineCoreResourceModal: React.FC<DeletePipelineCoreResourceModalProps> = ({
  toDeleteResources,
  onClose,
  type,
}) => {
  const { api } = usePipelinesAPI();
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [deleteStatuses, setDeleteStatus] = React.useState<(true | Error | undefined)[]>([]);
  const abortControllerRef = React.useRef(new AbortController());
  const notification = useNotification();

  const resourceCount = toDeleteResources.length;

  const onBeforeCloseRef = React.useRef<(v: boolean) => void>(() => undefined);
  onBeforeCloseRef.current = (deleteComplete: boolean) => {
    const deleteErrors = deleteStatuses.reduce<React.ReactNode[]>((acc, state, i) => {
      if (state instanceof Error) {
        const resource = toDeleteResources[i];
        acc.push(
          <p key={resource.name}>
            For <b>{resource.name}</b>: {state.message}
          </p>,
        );
      }
      return acc;
    }, []);

    if (!deleteComplete || deleteErrors.length === 0) {
      abortControllerRef.current.abort(); // cancel existing resources
      onClose(deleteComplete);
    } else {
      notification.error(`Errors with deleting ${type}s`, <>{deleteErrors}</>);
      onClose(true);
    }

    setDeleting(false);
    setError(null);
    setDeleteStatus([]);
    abortControllerRef.current = new AbortController();
  };

  return (
    <DeleteModal
      title={`Delete ${type}${resourceCount > 1 ? 's' : ''}`}
      isOpen={resourceCount !== 0}
      onClose={() => onBeforeCloseRef.current(false)}
      deleting={deleting}
      error={error ?? undefined}
      onDelete={() => {
        if (resourceCount === 0) {
          return;
        }

        let callFunc: (opts: K8sAPIOptions, id: string) => Promise<void>;
        switch (type) {
          case 'pipeline':
            callFunc = api.deletePipeline;
            break;
          case 'scheduled run':
            callFunc = api.deletePipelineRunJob;
            break;
          case 'triggered run':
            callFunc = api.deletePipelineRun;
            break;
          default:
            // eslint-disable-next-line no-console
            console.error(`Unable to delete due to unknown type (${type})`);
            setError(new Error('Unable to perform delete for unknown reasons.'));
            return;
        }
        setDeleting(true);
        setError(null);

        if (resourceCount === 1) {
          callFunc({ signal: abortControllerRef.current.signal }, toDeleteResources[0].id)
            .then(() => onBeforeCloseRef.current(true))
            .catch((e) => {
              setError(e);
              setDeleting(false);
            });
        } else {
          Promise.all(
            toDeleteResources.map((resource, i) =>
              callFunc({ signal: abortControllerRef.current.signal }, resource.id)
                .then(() => true)
                .catch((e) => e)
                .then((value: true | Error) => {
                  setDeleteStatus((oldValues) => {
                    const arr = [...oldValues];
                    arr[i] = value;
                    return arr;
                  });
                }),
            ),
          )
            .catch((e) => {
              // eslint-disable-next-line no-console
              console.error('Error deleting in bulk', e);
            })
            .then(() => {
              onBeforeCloseRef.current(true);
            });
        }
      }}
      submitButtonLabel={`Delete ${type}${resourceCount > 1 ? 's' : ''}`}
      deleteName={
        resourceCount === 1 ? toDeleteResources[0].name : `Delete ${resourceCount} ${type}s`
      }
    >
      {resourceCount <= 1 ? (
        <>This action cannot be undone.</>
      ) : (
        <Stack hasGutter>
          <StackItem>
            <Text>
              You are about to delete {resourceCount} {type}s. This action cannot be undone.
            </Text>
          </StackItem>
          <StackItem>
            <List>
              {toDeleteResources.map((resource, i) => {
                let icon: React.ReactNode;
                if (!deleting) {
                  icon = null;
                } else {
                  const state = deleteStatuses[i];
                  if (state === undefined) {
                    icon = <PendingIcon />;
                  } else if (state === true) {
                    icon = (
                      <Icon status="success">
                        <CheckCircleIcon />
                      </Icon>
                    );
                  } else {
                    icon = (
                      <Tooltip content={state.message}>
                        <Icon status="danger">
                          <ExclamationCircleIcon />
                        </Icon>
                      </Tooltip>
                    );
                  }
                }

                return (
                  <ListItem key={resource.id} icon={icon}>
                    {resource.name}
                  </ListItem>
                );
              })}
            </List>
          </StackItem>
        </Stack>
      )}
    </DeleteModal>
  );
};

export default DeletePipelineCoreResourceModal;
