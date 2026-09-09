import React from 'react';
import {
  FormGroup,
  FormSection,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';
import type { PersistentVolumeClaimKind } from '@odh-dashboard/k8s-core';
import type { PVCStorageContextSettingsFieldsProps } from '@odh-dashboard/plugin-core/extension-points';

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
      <FormGroup label="Subpath" fieldId="nim-subpath">
        <TextInput
          id="nim-subpath"
          data-testid="nim-subpath-input"
          value={subPath}
          onChange={(_event, value) => {
            setSubPath(value);
            onChange({ [NIM_PVC_SUBPATH_ANNOTATION]: value });
          }}
          placeholder="/"
        />
        <HelperText>
          <HelperTextItem>
            Optional: Subdirectory within the PVC. Use this if you have multiple models stored in
            the same PVC. Leave blank to use the root of the PVC.
          </HelperTextItem>
        </HelperText>
      </FormGroup>
    </FormSection>
  );
};

export default Fields;
