import React from 'react';
import { z } from 'zod';
import {
  FormGroup,
  FormSection,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import NumberInputWrapper from '@odh-dashboard/internal/components/NumberInputWrapper';
import type { SimpleSelectOption } from '@odh-dashboard/internal/components/SimpleSelect';
import type { ProjectSectionType } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ProjectSection';
import type { WizardField } from '@odh-dashboard/model-serving/types/form-data';
import { NIMModelLocationKey } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/modelLocationFields/NIMModelLocation';

export type NIMPVCStorageMode = 'new' | 'existing';

export type NIMPVCFieldValue = {
  storageMode: NIMPVCStorageMode;
  pvcName: string;
  modelPath: string;
  subPath: string;
  storageClassName: string;
  storageSizeGi: number;
};

const DEFAULT_MODEL_PATH = '/model-store';
const DEFAULT_SUBPATH = '/';
const DEFAULT_STORAGE_SIZE_GI = 50;
const MIN_STORAGE_SIZE_GI = 1;

const nimPVCFieldSchema = z
  .object({
    storageMode: z.enum(['new', 'existing']),
    pvcName: z.string().min(1, 'Cluster storage name is required'),
    modelPath: z.string().min(1, 'Model path is required'),
    subPath: z.string(),
    storageClassName: z.string(),
    storageSizeGi: z.number().min(MIN_STORAGE_SIZE_GI, 'Storage size must be at least 1 GiB'),
  })
  .superRefine((data, ctx) => {
    if (data.storageMode === 'new' && !data.storageClassName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Storage class is required for new storage',
        path: ['storageClassName'],
      });
    }
  });

type NIMPVCDependencies = {
  project: ProjectSectionType;
};

type StorageClassOption = {
  name: string;
  displayName: string;
};

type NIMPVCExternalData = {
  storageClasses: StorageClassOption[];
  existingPVCs: string[];
};

const useNIMPVCExternalData = (dependencies?: {
  project?: { projectName?: string };
}): {
  data: NIMPVCExternalData;
  loaded: boolean;
  loadError?: Error;
} => {
  const projectName = dependencies?.project?.projectName;
  const loaded = !!projectName;

  return React.useMemo(
    () => ({
      data: {
        storageClasses: [{ name: 'gp3-csi', displayName: 'gp3-csi' }],
        existingPVCs: [],
      },
      loaded,
    }),
    [loaded],
  );
};

const getDefaultFieldValue = (): NIMPVCFieldValue => ({
  storageMode: 'new',
  pvcName: '',
  modelPath: DEFAULT_MODEL_PATH,
  subPath: DEFAULT_SUBPATH,
  storageClassName: '',
  storageSizeGi: DEFAULT_STORAGE_SIZE_GI,
});

type NIMPVCFieldComponentProps = {
  value?: NIMPVCFieldValue;
  onChange: (value: NIMPVCFieldValue) => void;
  externalData?: { data: NIMPVCExternalData; loaded: boolean; loadError?: Error };
  isDisabled?: boolean;
};

const NIMPVCFieldComponent: React.FC<NIMPVCFieldComponentProps> = ({
  value,
  onChange,
  externalData,
  isDisabled,
}) => {
  const fieldValue = React.useMemo(() => value ?? getDefaultFieldValue(), [value]);

  const updateField = React.useCallback(
    (patch: Partial<NIMPVCFieldValue>) => {
      onChange({ ...fieldValue, ...patch });
    },
    [fieldValue, onChange],
  );

  const storageClasses = externalData?.data.storageClasses ?? [];
  const existingPVCs = externalData?.data.existingPVCs ?? [];

  const storageModeOptions: SimpleSelectOption[] = [
    {
      key: 'new',
      label: 'Deploy the NIM image from a new cluster storage',
    },
    {
      key: 'existing',
      label: 'Deploy the NIM image from an existing cluster storage',
    },
  ];

  const storageClassOptions: SimpleSelectOption[] = storageClasses.map((sc) => ({
    key: sc.name,
    label: sc.displayName,
  }));

  const existingPVCOptions: SimpleSelectOption[] = existingPVCs.map((pvc) => ({
    key: pvc,
    label: pvc,
  }));

  return (
    <FormSection title="Storage and deployment option">
      <FormGroup label="Storage and deployment option" fieldId="nim-storage-mode" isRequired>
        <SimpleSelect
          dataTestId="nim-storage-mode-select"
          options={storageModeOptions}
          value={fieldValue.storageMode}
          onChange={(val) => {
            const mode: NIMPVCStorageMode = val === 'existing' ? 'existing' : 'new';
            updateField({
              storageMode: mode,
              pvcName: '',
              storageClassName: mode === 'new' ? storageClasses[0]?.name ?? '' : '',
            });
          }}
          isDisabled={isDisabled}
          isFullWidth
        />
      </FormGroup>

      {fieldValue.storageMode === 'new' ? (
        <>
          <FormGroup label="Cluster storage name" fieldId="nim-pvc-name" isRequired>
            <TextInput
              id="nim-pvc-name"
              data-testid="nim-pvc-name-input"
              value={fieldValue.pvcName}
              onChange={(_event, val) => updateField({ pvcName: val })}
              placeholder="nim-pvc"
              isDisabled={isDisabled}
            />
            <HelperText>
              <HelperTextItem>
                This cluster storage can be reused for future deployments of this NIM image.
              </HelperTextItem>
            </HelperText>
          </FormGroup>

          <FormGroup label="Model path" fieldId="nim-model-path" isRequired>
            <TextInput
              id="nim-model-path"
              data-testid="nim-model-path-input"
              value={fieldValue.modelPath}
              onChange={(_event, val) => updateField({ modelPath: val })}
              placeholder={DEFAULT_MODEL_PATH}
              isDisabled={isDisabled}
            />
            <HelperText>
              <HelperTextItem>
                Path within the container where model files will be mounted.
              </HelperTextItem>
            </HelperText>
          </FormGroup>

          <FormGroup label="Subpath" fieldId="nim-subpath">
            <TextInput
              id="nim-subpath"
              data-testid="nim-subpath-input"
              value={fieldValue.subPath}
              onChange={(_event, val) => updateField({ subPath: val })}
              placeholder="/"
              isDisabled={isDisabled}
            />
            <HelperText>
              <HelperTextItem>
                Optional: Subdirectory within the PVC. Use this if you have multiple models stored
                in the same PVC. Leave blank to use the root of the PVC.
              </HelperTextItem>
            </HelperText>
          </FormGroup>

          <FormGroup label="Storage class" fieldId="nim-storage-class">
            <SimpleSelect
              dataTestId="nim-storage-class-select"
              options={storageClassOptions}
              value={fieldValue.storageClassName}
              onChange={(val) => updateField({ storageClassName: val })}
              isDisabled={isDisabled}
              isFullWidth
              placeholder="Select storage class"
            />
          </FormGroup>

          <FormGroup label="NVIDIA NIM storage size" fieldId="nim-storage-size" isRequired>
            <NumberInputWrapper
              id="nim-storage-size"
              data-testid="nim-storage-size-input"
              value={fieldValue.storageSizeGi}
              min={MIN_STORAGE_SIZE_GI}
              onChange={(val) =>
                updateField({
                  storageSizeGi: Math.max(MIN_STORAGE_SIZE_GI, val ?? DEFAULT_STORAGE_SIZE_GI),
                })
              }
              unit="GiB"
              isDisabled={isDisabled}
            />
            <HelperText>
              <HelperTextItem>
                Specify the size of the PVC. Make sure it is larger than the NIM image size
                specified by NVIDIA.
              </HelperTextItem>
            </HelperText>
          </FormGroup>
        </>
      ) : (
        <>
          <FormGroup label="Cluster storage name" fieldId="nim-existing-pvc" isRequired>
            <SimpleSelect
              dataTestId="nim-existing-pvc-select"
              options={existingPVCOptions}
              value={fieldValue.pvcName}
              onChange={(val) => updateField({ pvcName: val })}
              isDisabled={isDisabled}
              isFullWidth
              placeholder="Select..."
            />
          </FormGroup>

          <FormGroup label="Model path" fieldId="nim-model-path-existing" isRequired>
            <TextInput
              id="nim-model-path-existing"
              data-testid="nim-model-path-existing-input"
              value={fieldValue.modelPath}
              onChange={(_event, val) => updateField({ modelPath: val })}
              placeholder={DEFAULT_MODEL_PATH}
              isDisabled={isDisabled}
            />
            <HelperText>
              <HelperTextItem>
                Path within the container where model files will be mounted.
              </HelperTextItem>
            </HelperText>
          </FormGroup>

          <FormGroup label="Subpath" fieldId="nim-subpath-existing">
            <TextInput
              id="nim-subpath-existing"
              data-testid="nim-subpath-existing-input"
              value={fieldValue.subPath}
              onChange={(_event, val) => updateField({ subPath: val })}
              placeholder="/"
              isDisabled={isDisabled}
            />
            <HelperText>
              <HelperTextItem>
                Optional: Subdirectory within the PVC. Use this if you have multiple models stored
                in the same PVC. Leave blank to use the root of the PVC.
              </HelperTextItem>
            </HelperText>
          </FormGroup>
        </>
      )}
    </FormSection>
  );
};

export type NIMPVCFieldType = WizardField<NIMPVCFieldValue, NIMPVCExternalData, NIMPVCDependencies>;

export const NIMPVCFieldWizardField: NIMPVCFieldType = {
  id: 'nim-serving/pvcStorage',
  step: 'modelDeployment',
  type: 'addition',
  isActive: (wizardFormData) =>
    wizardFormData.modelLocationData?.data?.type === NIMModelLocationKey,
  reducerFunctions: {
    setFieldData: (value: NIMPVCFieldValue) => value,
    getInitialFieldData: (existingFieldData?: NIMPVCFieldValue): NIMPVCFieldValue =>
      existingFieldData ?? getDefaultFieldValue(),
    validationSchema: nimPVCFieldSchema,
    resolveDependencies: (formData) => ({ project: formData.project }),
  },
  component: NIMPVCFieldComponent,
  externalDataHook: useNIMPVCExternalData,
  getReviewSections: (value) => [
    {
      title: 'NIM Storage',
      items: [
        {
          key: 'storageMode',
          label: 'Storage mode',
          value: () => (value.storageMode === 'new' ? 'New storage' : 'Existing storage'),
        },
        {
          key: 'pvcName',
          label: 'Cluster storage name',
          value: () => value.pvcName || '-',
        },
        {
          key: 'modelPath',
          label: 'Model path',
          value: () => value.modelPath || '-',
        },
        {
          key: 'subPath',
          label: 'Subpath',
          value: () => value.subPath || '-',
          optional: true,
          isVisible: () => !!value.subPath && value.subPath !== '/',
        },
        {
          key: 'storageClass',
          label: 'Storage class',
          value: () => value.storageClassName || '-',
          isVisible: () => value.storageMode === 'new',
        },
        {
          key: 'storageSize',
          label: 'Storage size',
          value: () => `${value.storageSizeGi} GiB`,
          isVisible: () => value.storageMode === 'new',
        },
      ],
    },
  ],
};
