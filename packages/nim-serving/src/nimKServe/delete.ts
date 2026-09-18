import { deletePvc } from '@odh-dashboard/internal/api';
import type { K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import type { K8sAPIOptions } from '@odh-dashboard/k8s-core';

type DeletePVC = (
  name: string,
  namespace: string,
  options?: K8sAPIOptions,
) => Promise<K8sStatus | undefined>;

export type DeleteLegacyNIMDeploymentArgs = {
  deletePrimaryDeployment: (options?: K8sAPIOptions) => Promise<void>;
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
  const deletePVCWithStatusCheck = async (options?: K8sAPIOptions): Promise<void> => {
    if (!pvcName) {
      return;
    }

    try {
      const status = await deletePVCResource(pvcName, namespace, options);
      if (typeof status?.status === 'string' && status.status !== 'Success') {
        throw new Error(status.message);
      }
    } catch (error: unknown) {
      if (options?.dryRun) {
        throw new Error(
          `Nothing was deleted. Dry run deletion failed: PVC ${pvcName}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      throw new Error(
        `Unable to delete PVC ${pvcName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  };

  const dryRunOperations = [deletePrimaryDeployment({ dryRun: true })];
  if (deletePVC && pvcName) {
    dryRunOperations.push(deletePVCWithStatusCheck({ dryRun: true }));
  }
  await Promise.all(dryRunOperations);

  await deletePrimaryDeployment();
  if (deletePVC && pvcName) {
    await deletePVCWithStatusCheck();
  }
};
