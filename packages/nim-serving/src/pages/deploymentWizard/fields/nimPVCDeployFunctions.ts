import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import type { DeploymentHookPayloadFor } from '@odh-dashboard/model-serving/extension-points';
import { createPvc } from '@odh-dashboard/internal/api';
import { NIMPVCStorageMode, type NIMPVCFieldValue } from './NIMPVCField';
import type { NIMDeployment } from '../../../api/nimservices/types';
import {
  NIM_PVC_ANNOTATION,
  NIM_PVC_SUBPATH_ANNOTATION,
} from '../../clusterStorage/clusterStorage';

export const nimPVCPreDeploy = async (
  fieldData: NIMPVCFieldValue,
  wizardState: WizardFormData['state'],
  deployment: DeploymentHookPayloadFor<NIMDeployment>,
): Promise<DeploymentHookPayloadFor<NIMDeployment>> => {
  const { projectName } = wizardState.project;
  if (!projectName) {
    throw new Error('Project is required to create PVC storage');
  }

  if (fieldData.storageMode !== NIMPVCStorageMode.NEW || !deployment.model) {
    return deployment;
  }

  const pvc = await createPvc(
    {
      name: fieldData.pvcName,
      description: '',
      size: `${fieldData.storageSizeGi}Gi`,
      storageClassName: fieldData.storageClassName,
    },
    projectName,
    undefined,
    false,
    {
      [NIM_PVC_ANNOTATION]: 'true',
      ...(fieldData.subPath &&
        fieldData.subPath !== '/' && { [NIM_PVC_SUBPATH_ANNOTATION]: fieldData.subPath }),
    },
    { 'opendatahub.io/managed': 'true' },
  );

  return {
    ...deployment,
    model: {
      ...deployment.model,
      spec: {
        ...deployment.model.spec,
        storage: {
          pvc: {
            name: pvc.metadata.name,
            subPath: fieldData.subPath
              ? fieldData.subPath.replace(/^\//, '') || undefined
              : undefined,
          },
        },
      },
    },
  };
};

export const nimPVCPostDeploy = async (): Promise<void> => {
  // No-op: PVC persists independently of the NIMService for reuse
};
