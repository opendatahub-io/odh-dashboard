import { deletePvc } from '@odh-dashboard/internal/api';
import type { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import type { NIMKServePVCReference } from './deleteUtils';

type DeletePVC = (name: string, namespace: string) => Promise<K8sStatus>;

export type DeleteLegacyNIMDeploymentArgs = {
  deletePrimaryDeployment: () => Promise<void>;
  pvcToDelete?: NIMKServePVCReference;
  deletePVC: boolean;
  deletePVCResource?: DeletePVC;
};

/** Deletes a legacy NIM deployment, optionally deleting its cache PVC afterward. */
export const deleteLegacyNIMDeployment = async ({
  deletePrimaryDeployment,
  pvcToDelete,
  deletePVC,
  deletePVCResource = deletePvc,
}: DeleteLegacyNIMDeploymentArgs): Promise<void> => {
  await deletePrimaryDeployment();

  if (!deletePVC || !pvcToDelete) {
    return;
  }

  const status = await deletePVCResource(pvcToDelete.name, pvcToDelete.namespace);
  if (status.status !== 'Success') {
    throw new Error(`Unable to delete PVC ${pvcToDelete.name}: ${status.message}`);
  }
};
