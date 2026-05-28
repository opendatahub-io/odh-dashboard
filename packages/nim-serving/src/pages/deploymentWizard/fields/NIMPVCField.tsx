import React from 'react';
import { z } from 'zod';
import {
  FormGroup,
  FormSection,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';
import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import NumberInputWrapper from '@odh-dashboard/internal/components/NumberInputWrapper';
import type { SimpleSelectOption } from '@odh-dashboard/internal/components/SimpleSelect';
import type { ProjectSectionType } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ProjectSection';
import type { WizardField } from '@odh-dashboard/model-serving/types/form-data';
import { NIMModelLocationKey } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/modelLocationFields/NIMModelLocation';
import { getStorageClasses } from '@odh-dashboard/internal/api/k8s/storageClasses';
import { PVCModel } from '@odh-dashboard/internal/api/models';
import type { PersistentVolumeClaimKind, StorageClassKind } from '@odh-dashboard/internal/k8sTypes';
import { MetadataAnnotation } from '@odh-dashboard/internal/k8sTypes';

export enum NIMPVCStorageMode {
  NEW = 'new',
  EXISTING = 'existing',
}

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
    storageMode: z.nativeEnum(NIMPVCStorageMode),
    pvcName: z.string().min(1, 'Cluster storage name is required'),
    modelPath: z.string().min(1, 'Model path is required'),
    subPath: z.string(),
    storageClassName: z.string(),
    storageSizeGi: z.number().min(MIN_STORAGE_SIZE_GI, 'Storage size must be at least 1 GiB'),
  })
  .superRefine((data, ctx) => {
    if (data.storageMode === NIMPVCStorageMode.NEW && !data.storageClassName) {
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
  defaultStorageClassName: string;
  existingPVCs: string[];
};

const isDefaultStorageClass = (sc: StorageClassKind): boolean =>
  sc.metadata.annotations?.[MetadataAnnotation.StorageClassIsDefault] === 'true';

const isNIMPVC = (pvcName: string): boolean => pvcName.startsWith('nim-pvc');

const sortPVCsNIMFirst = (pvcs: PersistentVolumeClaimKind[]): string[] => {
  const nimPVCs: string[] = [];
  const otherPVCs: string[] = [];

  for (const pvc of pvcs) {
    const { name } = pvc.metadata;
    if (isNIMPVC(name)) {
      nimPVCs.push(name);
    } else {
      otherPVCs.push(name);
    }
  }

  return [...nimPVCs, ...otherPVCs];
};

const useNIMPVCExternalData = (dependencies?: {
  project?: { projectName?: string };
}): {
  data: NIMPVCExternalData;
  loaded: boolean;
  loadError?: Error;
} => {
  const projectName = dependencies?.project?.projectName;

  const [storageClasses, setStorageClasses] = React.useState<StorageClassOption[]>([]);
  const [defaultStorageClassName, setDefaultStorageClassName] = React.useState('');
  const [existingPVCs, setExistingPVCs] = React.useState<string[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error>();

  React.useEffect(() => {
    if (!projectName) {
      setLoaded(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      try {
        const [scList, pvcList] = await Promise.all([
          getStorageClasses(),
          k8sListResourceItems<PersistentVolumeClaimKind>({
            model: PVCModel,
            queryOptions: { ns: projectName },
          }),
        ]);

        if (cancelled) {
          return;
        }

        const scOptions = scList.map((sc) => ({
          name: sc.metadata.name,
          displayName: sc.metadata.annotations?.['openshift.io/display-name'] || sc.metadata.name,
        }));

        const defaultSc = scList.find(isDefaultStorageClass);

        setStorageClasses(scOptions);
        setDefaultStorageClassName(defaultSc?.metadata.name ?? '');
        setExistingPVCs(sortPVCsNIMFirst(pvcList));
        setLoadError(undefined);
        setLoaded(true);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e : new Error('Failed to load storage data'));
          setLoaded(true);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [projectName]);

  return React.useMemo(
    () => ({
      data: { storageClasses, defaultStorageClassName, existingPVCs },
      loaded,
      loadError,
    }),
    [storageClasses, defaultStorageClassName, existingPVCs, loaded, loadError],
  );
};

const getDefaultFieldValue = (): NIMPVCFieldValue => ({
  storageMode: NIMPVCStorageMode.NEW,
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

type ModelPathFieldsProps = {
  modelPath: string;
  subPath: string;
  onModelPathChange: (val: string) => void;
  onSubPathChange: (val: string) => void;
  isDisabled?: boolean;
  idSuffix?: string;
};

const ModelPathFields: React.FC<ModelPathFieldsProps> = ({
  modelPath,
  subPath,
  onModelPathChange,
  onSubPathChange,
  isDisabled,
  idSuffix = '',
}) => (
  <>
    <FormGroup label="Model path" fieldId={`nim-model-path${idSuffix}`} isRequired>
      <TextInput
        id={`nim-model-path${idSuffix}`}
        data-testid={`nim-model-path${idSuffix}-input`}
        value={modelPath}
        onChange={(_event, val) => onModelPathChange(val)}
        placeholder={DEFAULT_MODEL_PATH}
        isDisabled={isDisabled}
      />
      <HelperText>
        <HelperTextItem>
          Path within the container where model files will be mounted.
        </HelperTextItem>
      </HelperText>
    </FormGroup>

    <FormGroup label="Subpath" fieldId={`nim-subpath${idSuffix}`}>
      <TextInput
        id={`nim-subpath${idSuffix}`}
        data-testid={`nim-subpath${idSuffix}-input`}
        value={subPath}
        onChange={(_event, val) => onSubPathChange(val)}
        placeholder="/"
        isDisabled={isDisabled}
      />
      <HelperText>
        <HelperTextItem>
          Optional: Subdirectory within the PVC. Use this if you have multiple models stored in the
          same PVC. Leave blank to use the root of the PVC.
        </HelperTextItem>
      </HelperText>
    </FormGroup>
  </>
);

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
  const defaultStorageClassName = externalData?.data.defaultStorageClassName ?? '';
  const existingPVCs = externalData?.data.existingPVCs ?? [];

  React.useEffect(() => {
    if (
      fieldValue.storageMode === NIMPVCStorageMode.NEW &&
      !fieldValue.storageClassName &&
      defaultStorageClassName
    ) {
      updateField({ storageClassName: defaultStorageClassName });
    }
    // Only re-run when these specific values change, not on every fieldValue object reference change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultStorageClassName, fieldValue.storageMode, fieldValue.storageClassName]);

  const storageModeOptions: SimpleSelectOption[] = [
    {
      key: NIMPVCStorageMode.NEW,
      label: 'Deploy the NIM image from a new cluster storage',
    },
    {
      key: NIMPVCStorageMode.EXISTING,
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
            const mode =
              val === NIMPVCStorageMode.EXISTING
                ? NIMPVCStorageMode.EXISTING
                : NIMPVCStorageMode.NEW;
            updateField({
              storageMode: mode,
              pvcName: '',
              storageClassName:
                mode === NIMPVCStorageMode.NEW
                  ? defaultStorageClassName || storageClasses[0]?.name || ''
                  : '',
            });
          }}
          isDisabled={isDisabled}
          isFullWidth
        />
      </FormGroup>

      {fieldValue.storageMode === NIMPVCStorageMode.NEW ? (
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

          <ModelPathFields
            modelPath={fieldValue.modelPath}
            subPath={fieldValue.subPath}
            onModelPathChange={(val) => updateField({ modelPath: val })}
            onSubPathChange={(val) => updateField({ subPath: val })}
            isDisabled={isDisabled}
          />

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

          <ModelPathFields
            modelPath={fieldValue.modelPath}
            subPath={fieldValue.subPath}
            onModelPathChange={(val) => updateField({ modelPath: val })}
            onSubPathChange={(val) => updateField({ subPath: val })}
            isDisabled={isDisabled}
            idSuffix="-existing"
          />
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
    getInitialFieldData: (
      existingFieldData?: NIMPVCFieldValue,
      externalData?: NIMPVCExternalData,
    ): NIMPVCFieldValue =>
      existingFieldData ?? {
        ...getDefaultFieldValue(),
        storageClassName: externalData?.defaultStorageClassName ?? '',
      },
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
          value: () =>
            value.storageMode === NIMPVCStorageMode.NEW ? 'New storage' : 'Existing storage',
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
          isVisible: () => value.storageMode === NIMPVCStorageMode.NEW,
        },
        {
          key: 'storageSize',
          label: 'Storage size',
          value: () => `${value.storageSizeGi} GiB`,
          isVisible: () => value.storageMode === NIMPVCStorageMode.NEW,
        },
      ],
    },
  ],
};
