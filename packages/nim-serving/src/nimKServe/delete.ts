import { deletePvc } from '@odh-dashboard/internal/api';
import type { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';

type DeletePVC = (name: string, namespace: string) => Promise<K8sStatus | undefined>;

export type DeleteLegacyNIMDeploymentArgs = {
  deletePrimaryDeployment: () => Promise<void>;
  namespace: string;
  pvcName?: string;
  deletePVC: boolean;
  deletePVCResource?: DeletePVC;
};

/** Deletes a legacy NIM deployment, optionally deleting its cache PVC afterward. */
export const deleteLegacyNIMDeployment = async ({
  deletePrimaryDeployment,
  namespace,
  pvcName,
  deletePVC,
  deletePVCResource = deletePvc,
}: DeleteLegacyNIMDeploymentArgs): Promise<void> => {
  await deletePrimaryDeployment();

  if (!deletePVC || !pvcName) {
    return;
  }

  const status = await deletePVCResource(pvcName, namespace);
  if (typeof status?.status === 'string' && status.status !== 'Success') {
    throw new Error(`Unable to delete PVC ${pvcName}: ${status.message}`);
  }
};
