import * as React from 'react';
import { Alert, Checkbox, List, ListItem, Spinner, Stack, StackItem } from '@patternfly/react-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import type { ModelServingDeleteModalComponentProps } from '@odh-dashboard/model-serving/extension-points';
import { DeleteModal } from '@odh-dashboard/ui-core';
import useFetch, { NotReadyError } from '@odh-dashboard/ui-core/hooks/useFetch';
import { getKServePVCDependentDeployments } from '@odh-dashboard/kserve/pvcDependents';
import type { KServeDeployment } from '@odh-dashboard/kserve/types';
import { deleteLegacyNIMDeployment } from './delete';
import { getNIMCachePVCReference } from './deleteUtils';

type Props = ModelServingDeleteModalComponentProps<KServeDeployment>;

const DEPENDENTS_ALERT_ID = 'nim-delete-pvc-dependents-alert';

const NIMKServeDeleteModal: React.FC<Props> = ({
  deployment,
  onClose,
  onDelete: deletePrimaryDeployment,
  title,
  submitButtonLabel,
}) => {
  const [deletePVC, setDeletePVC] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<Error>();
  const nimCachePVCReference = React.useMemo(
    () => getNIMCachePVCReference(deployment),
    [deployment],
  );
  const deploymentName = getDisplayNameFromK8sResource(deployment.model);

  React.useEffect(() => {
    setDeletePVC(false);
    setDeleteError(undefined);
  }, [
    deployment.model.metadata.name,
    deployment.model.metadata.namespace,
    nimCachePVCReference?.name,
  ]);

  const fetchDependents = React.useCallback(async () => {
    if (!deletePVC) {
      throw new NotReadyError('PVC dependent lookup is disabled');
    }
    if (!nimCachePVCReference) {
      throw new NotReadyError('No cache PVC is available');
    }
    return getKServePVCDependentDeployments(
      nimCachePVCReference.namespace,
      nimCachePVCReference.name,
      deployment.model.metadata.name,
    );
  }, [deletePVC, deployment.model.metadata.name, nimCachePVCReference]);
  const {
    data: dependentDeployments,
    loaded,
    error: dependentError,
  } = useFetch(fetchDependents, [], { initialPromisePurity: true });

  const statusIsVisible = deletePVC && (loaded || !!dependentError);
  const isCheckingDependents = deletePVC && !loaded && !dependentError;

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(undefined);
    try {
      await deleteLegacyNIMDeployment({
        deletePrimaryDeployment,
        pvcToDelete: nimCachePVCReference,
        deletePVC,
      });
      onClose(true);
    } catch (error: unknown) {
      setDeleteError(error instanceof Error ? error : new Error('An unknown error occurred'));
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    onClose(false);
  };

  const additionalContent = nimCachePVCReference ? (
    <Stack hasGutter>
      <StackItem>
        <Checkbox
          id="nim-delete-pvc-checkbox"
          data-testid="nim-delete-pvc-checkbox"
          label={`Delete associated PVC (${nimCachePVCReference.name})`}
          isChecked={deletePVC}
          onChange={(_event, checked) => setDeletePVC(checked)}
          aria-describedby={
            statusIsVisible || isCheckingDependents ? DEPENDENTS_ALERT_ID : undefined
          }
        />
      </StackItem>
      {isCheckingDependents ? (
        <StackItem>
          <div aria-live="polite">
            <Alert
              id={DEPENDENTS_ALERT_ID}
              data-testid="nim-delete-pvc-dependents-loading"
              isInline
              variant="info"
              title="Checking PVC usage"
              customIcon={<Spinner size="md" />}
            >
              Checking whether other model deployments use this PVC.
            </Alert>
          </div>
        </StackItem>
      ) : null}
      {statusIsVisible ? (
        <StackItem>
          <div aria-live="polite">
            <Alert
              id={DEPENDENTS_ALERT_ID}
              data-testid="nim-delete-pvc-dependents-alert"
              isInline
              variant={dependentError || dependentDeployments.length > 0 ? 'warning' : 'info'}
              title={
                dependentError
                  ? 'PVC usage could not be determined'
                  : dependentDeployments.length > 0
                  ? 'Other model deployments use this PVC'
                  : 'PVC is not shared'
              }
            >
              {dependentError ? (
                'The PVC dependencies could not be determined. Proceeding may affect other model deployments.'
              ) : dependentDeployments.length > 0 ? (
                <>
                  Deleting this PVC may prevent these model deployments from loading their models:
                  <List>
                    {dependentDeployments.map((dependent) => (
                      <ListItem key={dependent.name} data-testid="nim-delete-pvc-dependent-item">
                        {dependent.displayName}
                      </ListItem>
                    ))}
                  </List>
                </>
              ) : (
                'No other model deployments use this PVC, so it will be deleted with this deployment.'
              )}
            </Alert>
          </div>
        </StackItem>
      ) : null}
    </Stack>
  ) : null;

  return (
    <DeleteModal
      title={title}
      onClose={handleClose}
      submitButtonLabel={submitButtonLabel}
      onDelete={handleDelete}
      deleting={isDeleting}
      error={deleteError}
      deleteName={deploymentName}
      additionalContent={additionalContent}
    >
      The <strong>{deploymentName}</strong> model deployment and its API keys will be deleted, and
      its model endpoint will no longer be available as an AI asset or MaaS.
    </DeleteModal>
  );
};

export default NIMKServeDeleteModal;
