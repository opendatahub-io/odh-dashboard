import React from 'react';
import {
  FormGroup,
  TextInput,
  Radio,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Stack,
} from '@patternfly/react-core';
import FormSection from '@odh-dashboard/internal/components/pf-overrides/FormSection';
import { FeastPvcConfig, FeastPvcCreate } from '../../../k8sTypes';

enum PvcMode {
  NONE = 'none',
  REF = 'ref',
  CREATE = 'create',
}

type PvcConfigSectionProps = {
  pvcConfig: FeastPvcConfig | undefined;
  onChange: (config: FeastPvcConfig | undefined) => void;
  defaultMountPath: string;
  defaultStorageSize: string;
  idPrefix: string;
};

const inferMode = (config: FeastPvcConfig | undefined): PvcMode => {
  if (!config) {
    return PvcMode.NONE;
  }
  if (config.ref) {
    return PvcMode.REF;
  }
  if (config.create) {
    return PvcMode.CREATE;
  }
  return PvcMode.NONE;
};

const PvcConfigSection: React.FC<PvcConfigSectionProps> = ({
  pvcConfig,
  onChange,
  defaultMountPath,
  defaultStorageSize,
  idPrefix,
}) => {
  const mode = inferMode(pvcConfig);

  const mountPath = pvcConfig?.mountPath ?? defaultMountPath;
  const create: FeastPvcCreate = pvcConfig?.create ?? {};
  const storageSize = create.resources?.requests?.storage ?? defaultStorageSize;

  const handleModeChange = (newMode: PvcMode) => {
    if (newMode === PvcMode.NONE) {
      onChange(undefined);
    } else if (newMode === PvcMode.REF) {
      onChange({ ref: { name: '' }, mountPath: mountPath || defaultMountPath });
    } else {
      onChange({
        create: {
          resources: { requests: { storage: defaultStorageSize } },
        },
        mountPath: mountPath || defaultMountPath,
      });
    }
  };

  return (
    <FormSection>
      <FormGroup fieldId={`${idPrefix}-pvc-mode`} label="Persistent volume">
        <Stack hasGutter>
          <Radio
            id={`${idPrefix}-pvc-none`}
            name={`${idPrefix}-pvc-mode`}
            label="Ephemeral storage"
            description="Data is lost when the pod restarts."
            isChecked={mode === PvcMode.NONE}
            onChange={() => handleModeChange(PvcMode.NONE)}
          />
          <Radio
            id={`${idPrefix}-pvc-ref`}
            name={`${idPrefix}-pvc-mode`}
            label="Use existing PVC"
            description="Reference an existing PersistentVolumeClaim."
            isChecked={mode === PvcMode.REF}
            onChange={() => handleModeChange(PvcMode.REF)}
          />
          <Radio
            id={`${idPrefix}-pvc-create`}
            name={`${idPrefix}-pvc-mode`}
            label="Create new PVC"
            description="Operator creates a PVC automatically."
            isChecked={mode === PvcMode.CREATE}
            onChange={() => handleModeChange(PvcMode.CREATE)}
          />
        </Stack>
      </FormGroup>

      {mode === PvcMode.REF && (
        <>
          <FormGroup label="PVC name" isRequired fieldId={`${idPrefix}-pvc-ref-name`}>
            <TextInput
              id={`${idPrefix}-pvc-ref-name`}
              value={pvcConfig?.ref?.name ?? ''}
              onChange={(_e, val) =>
                onChange({ ...pvcConfig, ref: { name: val }, mountPath, create: undefined })
              }
              placeholder="my-existing-pvc"
            />
          </FormGroup>
          <FormGroup label="Mount path" isRequired fieldId={`${idPrefix}-pvc-mount-path-ref`}>
            <TextInput
              id={`${idPrefix}-pvc-mount-path-ref`}
              value={mountPath}
              onChange={(_e, val) =>
                onChange({ ...pvcConfig, ref: pvcConfig?.ref ?? { name: '' }, mountPath: val })
              }
              placeholder={defaultMountPath}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Absolute path where the volume is mounted inside the container.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </>
      )}

      {mode === PvcMode.CREATE && (
        <>
          <FormGroup label="Storage size" fieldId={`${idPrefix}-pvc-storage-size`}>
            <TextInput
              id={`${idPrefix}-pvc-storage-size`}
              value={storageSize}
              onChange={(_e, val) =>
                onChange({
                  ...pvcConfig,
                  ref: undefined,
                  create: {
                    ...create,
                    resources: { requests: { storage: val || defaultStorageSize } },
                  },
                  mountPath,
                })
              }
              placeholder={defaultStorageSize}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>e.g. 5Gi, 10Gi, 50Gi</HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup label="Storage class" fieldId={`${idPrefix}-pvc-storage-class`}>
            <TextInput
              id={`${idPrefix}-pvc-storage-class`}
              value={create.storageClassName ?? ''}
              onChange={(_e, val) =>
                onChange({
                  ...pvcConfig,
                  ref: undefined,
                  create: { ...create, storageClassName: val || undefined },
                  mountPath,
                })
              }
              placeholder="Cluster default if empty"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Leave empty to use the cluster&apos;s default StorageClass.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup label="Access mode" fieldId={`${idPrefix}-pvc-access-mode`}>
            <TextInput
              id={`${idPrefix}-pvc-access-mode`}
              value={create.accessModes?.join(', ') ?? ''}
              onChange={(_e, val) => {
                const parsed = val
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean);
                onChange({
                  ...pvcConfig,
                  ref: undefined,
                  create: {
                    ...create,
                    accessModes: parsed.length > 0 ? parsed : undefined,
                  },
                  mountPath,
                });
              }}
              placeholder="ReadWriteOnce"
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Comma-separated. Common values: ReadWriteOnce, ReadWriteMany, ReadOnlyMany.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
          <FormGroup label="Mount path" isRequired fieldId={`${idPrefix}-pvc-mount-path-create`}>
            <TextInput
              id={`${idPrefix}-pvc-mount-path-create`}
              value={mountPath}
              onChange={(_e, val) =>
                onChange({ ...pvcConfig, ref: undefined, create, mountPath: val })
              }
              placeholder={defaultMountPath}
            />
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  Absolute path where the volume is mounted inside the container.
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </FormGroup>
        </>
      )}
    </FormSection>
  );
};

export default PvcConfigSection;
