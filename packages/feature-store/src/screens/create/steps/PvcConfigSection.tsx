import React from 'react';
import {
  FormGroup,
  FormSection,
  TextInput,
  Radio,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { FeastPvcConfig, FeastPvcCreate } from '@odh-dashboard/internal/k8sTypes';

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
}) => {
  const [mode, setMode] = React.useState<PvcMode>(() => inferMode(pvcConfig));

  const mountPath = pvcConfig?.mountPath ?? defaultMountPath;
  const create: FeastPvcCreate = pvcConfig?.create ?? {};
  const storageSize =
    create.resources?.requests && typeof create.resources.requests === 'object'
      ? create.resources.requests.storage || defaultStorageSize
      : defaultStorageSize;

  const handleModeChange = (newMode: PvcMode) => {
    setMode(newMode);
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
      <FormGroup fieldId="pvc-mode" label="Persistent volume">
        <Radio
          id="pvc-none"
          name="pvc-mode"
          label="None (ephemeral storage)"
          description="Data is lost on pod restart"
          isChecked={mode === PvcMode.NONE}
          onChange={() => handleModeChange(PvcMode.NONE)}
        />
        <Radio
          id="pvc-ref"
          name="pvc-mode"
          label="Use existing PVC"
          description="Reference a pre-created PersistentVolumeClaim"
          isChecked={mode === PvcMode.REF}
          onChange={() => handleModeChange(PvcMode.REF)}
          className="pf-v6-u-mt-sm"
        />
        <Radio
          id="pvc-create"
          name="pvc-mode"
          label="Create new PVC"
          description="Operator creates a PVC automatically"
          isChecked={mode === PvcMode.CREATE}
          onChange={() => handleModeChange(PvcMode.CREATE)}
          className="pf-v6-u-mt-sm"
        />
      </FormGroup>

      {mode === PvcMode.REF && (
        <>
          <FormGroup label="PVC name" isRequired fieldId="pvc-ref-name">
            <TextInput
              id="pvc-ref-name"
              value={pvcConfig?.ref?.name ?? ''}
              onChange={(_e, val) =>
                onChange({ ...pvcConfig, ref: { name: val }, mountPath, create: undefined })
              }
              placeholder="my-existing-pvc"
            />
          </FormGroup>
          <FormGroup label="Mount path" isRequired fieldId="pvc-mount-path-ref">
            <TextInput
              id="pvc-mount-path-ref"
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
          <FormGroup label="Storage size" fieldId="pvc-storage-size">
            <TextInput
              id="pvc-storage-size"
              value={storageSize}
              onChange={(_e, val) =>
                onChange({
                  ...pvcConfig,
                  ref: undefined,
                  create: { ...create, resources: { requests: { storage: val } } },
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
          <FormGroup label="Storage class" fieldId="pvc-storage-class">
            <TextInput
              id="pvc-storage-class"
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
          <FormGroup label="Access mode" fieldId="pvc-access-mode">
            <TextInput
              id="pvc-access-mode"
              value={create.accessModes?.join(', ') ?? 'ReadWriteOnce'}
              onChange={(_e, val) =>
                onChange({
                  ...pvcConfig,
                  ref: undefined,
                  create: {
                    ...create,
                    accessModes: val
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                  mountPath,
                })
              }
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
          <FormGroup label="Mount path" isRequired fieldId="pvc-mount-path-create">
            <TextInput
              id="pvc-mount-path-create"
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
