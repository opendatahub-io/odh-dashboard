import React from 'react';
import { FormSection } from '@patternfly/react-core';
import type { PersistentVolumeClaimKind } from '@odh-dashboard/k8s-core';
import type { PVCStorageContextSettingsFieldsProps } from '@odh-dashboard/plugin-core/extension-points';
import { SubPathField } from '../deploymentWizard/fields/NIMPVCField';

export const NIM_PVC_ANNOTATION = 'dashboard.opendatahub.io/nim-pvc';
export const NIM_PVC_SUBPATH_ANNOTATION = 'dashboard.opendatahub.io/nim-subpath';

export const isNIMPVC = (pvc: PersistentVolumeClaimKind): boolean =>
  !!pvc.metadata.annotations && Object.hasOwn(pvc.metadata.annotations, NIM_PVC_ANNOTATION);

const Fields: React.FC<PVCStorageContextSettingsFieldsProps> = ({ existingPvc, onChange }) => {
  const [subPath, setSubPath] = React.useState(
    existingPvc.metadata.annotations?.[NIM_PVC_SUBPATH_ANNOTATION] ?? '',
  );

  return (
    <FormSection title="NIM details">
      <SubPathField
        subPath={subPath}
        onSubPathChange={(val: string) => {
          setSubPath(val);
          if (!val) {
            onChange({ [NIM_PVC_SUBPATH_ANNOTATION]: '' });
          } else {
            onChange({ [NIM_PVC_SUBPATH_ANNOTATION]: val });
          }
        }}
      />
    </FormSection>
  );
};

export default Fields;
