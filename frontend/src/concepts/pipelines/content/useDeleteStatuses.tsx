import * as React from 'react';
import { PipelineCoreResourceKF, PipelineCoreResourceKFv2 } from '~/concepts/pipelines/kfTypes';
import useNotification from '~/utilities/useNotification';
import { getPipelineResourceUniqueID } from './utils';

type DeleteStatusesProps = {
  onClose: (deleted?: boolean) => void;
  type: 'triggered run' | 'scheduled run' | 'pipeline';
  // TODO: remove OR when we move all to v2
  toDeleteResources: (PipelineCoreResourceKF | PipelineCoreResourceKFv2)[];
};

export type PipelineResourceDeleteResult = true | Error | undefined;

const useDeleteStatuses = ({
  onClose,
  type,
  toDeleteResources,
}: DeleteStatusesProps): {
  onBeforeClose: (deleted: boolean, deleteResults?: PipelineResourceDeleteResult[]) => void;
  deleting: boolean;
  setDeleting: (deleting: boolean) => void;
  error?: Error;
  setError: (error?: Error) => void;
  deleteStatuses: PipelineResourceDeleteResult[];
  abortSignal: AbortSignal;
} => {
  const notification = useNotification();
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [deleteStatuses, setDeleteStatuses] = React.useState<PipelineResourceDeleteResult[]>([]);
  const abortControllerRef = React.useRef(new AbortController());
  const onBeforeCloseRef = React.useRef<(v: boolean, r?: PipelineResourceDeleteResult[]) => void>(
    () => undefined,
  );
  onBeforeCloseRef.current = (
    deleteComplete: boolean,
    deleteResults: PipelineResourceDeleteResult[] = [],
  ) => {
    setDeleteStatuses(deleteResults);
    const deleteErrors = deleteResults.reduce<React.ReactNode[]>((acc, state, i) => {
      if (state instanceof Error) {
        const resource = toDeleteResources[i];
        const name =
          (resource as PipelineCoreResourceKF).name ??
          (resource as PipelineCoreResourceKFv2).display_name;
        const key =
          (resource as PipelineCoreResourceKF).id ??
          getPipelineResourceUniqueID(resource as PipelineCoreResourceKFv2);
        // TODO: remove this casting when we move all to v2
        acc.push(
          <p key={key}>
            <b>{name}</b>: {state.message}
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
    setError(undefined);
    setDeleteStatuses([]);
    abortControllerRef.current = new AbortController();
  };

  return {
    onBeforeClose: onBeforeCloseRef.current,
    deleting,
    setDeleting,
    error,
    setError,
    deleteStatuses,
    abortSignal: abortControllerRef.current.signal,
  };
};

export default useDeleteStatuses;
