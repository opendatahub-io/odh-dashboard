import React from 'react';
import { z } from 'zod';
import {
  FormGroup,
  FormSection,
  HelperText,
  HelperTextItem,
  Skeleton,
  TextInput,
} from '@patternfly/react-core';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import NumberInputWrapper from '@odh-dashboard/internal/components/NumberInputWrapper';
import type { SimpleSelectOption } from '@odh-dashboard/internal/components/SimpleSelect';
import type { ProjectSectionType } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ProjectSection';
import type { WizardField } from '@odh-dashboard/model-serving/types/form-data';
import { NIMModelLocationKey } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/modelLocationFields/NIMModelLocation';
import { getStorageClasses } from '@odh-dashboard/internal/api/k8s/storageClasses';
import { getDashboardPvcs } from '@odh-dashboard/internal/api/k8s/pvcs';
import type { PersistentVolumeClaimKind } from '@odh-dashboard/k8s-core';
import useFetch, {
  FetchStateCallbackPromise,
  NotReadyError,
} from '@odh-dashboard/internal/utilities/useFetch';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { useDefaultStorageClass } from '@odh-dashboard/internal/pages/projects/screens/spawner/storage/useDefaultStorageClass';

export enum NIMPVCStorageMode {
  NEW = 'new',
  EXISTING = 'existing',
}

export type NIMPVCFieldValue = {
  storageMode: NIMPVCStorageMode;
  pvcName: string;
  subPath: string;
  storageClassName: string;
  storageSizeGi: number;
};

const DEFAULT_SUBPATH = '';
const DEFAULT_STORAGE_SIZE_GI = 50;
const MIN_STORAGE_SIZE_GI = 1;

const nimPVCFieldSchema = z
  .object({
    storageMode: z.nativeEnum(NIMPVCStorageMode),
    pvcName: z.string().min(1, 'Cluster storage name is required'),
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

type ExistingPVCOption = {
  name: string;
  subPath?: string;
};

type NIMPVCExternalData = {
  storageClasses: StorageClassOption[];
  defaultStorageClassName: string;
  existingPVCs: ExistingPVCOption[];
};

export const NIM_PVC_ANNOTATION = 'dashboard.opendatahub.io/nim-pvc';
export const NIM_PVC_SUBPATH_ANNOTATION = 'dashboard.opendatahub.io/nim-subpath';

const isNIMPVC = (pvc: PersistentVolumeClaimKind): boolean =>
  pvc.metadata.annotations?.[NIM_PVC_ANNOTATION] === 'true';

const toPVCOption = (pvc: PersistentVolumeClaimKind): ExistingPVCOption => ({
  name: pvc.metadata.name,
  subPath: pvc.metadata.annotations?.[NIM_PVC_SUBPATH_ANNOTATION],
});

const sortPVCsNIMFirst = (pvcs: PersistentVolumeClaimKind[]): ExistingPVCOption[] => {
  const nimPVCs: ExistingPVCOption[] = [];
  const otherPVCs: ExistingPVCOption[] = [];

  for (const pvc of pvcs) {
    if (isNIMPVC(pvc)) {
      nimPVCs.push(toPVCOption(pvc));
    } else {
      otherPVCs.push(toPVCOption(pvc));
    }
  }

  return [...nimPVCs, ...otherPVCs];
};

type FetchedStorageData = {
  storageClasses: StorageClassOption[];
  existingPVCs: ExistingPVCOption[];
};

const DEFAULT_FETCHED_DATA: FetchedStorageData = { storageClasses: [], existingPVCs: [] };

const useNIMPVCExternalData = (dependencies?: {
  project?: { projectName?: string };
}): {
  data: NIMPVCExternalData;
  loaded: boolean;
  loadError?: Error;
} => {
  const projectName = dependencies?.project?.projectName;

  const [defaultStorageClass, defaultSCLoaded, defaultSCError] = useDefaultStorageClass();

  const fetchCallback = React.useCallback<
    FetchStateCallbackPromise<FetchedStorageData>
  >(async () => {
    if (!projectName) {
      return Promise.reject(new NotReadyError('No project selected'));
    }
    const [scList, pvcList] = await Promise.all([
      getStorageClasses(),
      getDashboardPvcs(projectName),
    ]);

    return {
      storageClasses: scList.map((sc) => ({
        name: sc.metadata.name,
        displayName: sc.metadata.annotations?.['openshift.io/display-name'] || sc.metadata.name,
      })),
      existingPVCs: sortPVCsNIMFirst(pvcList),
    };
  }, [projectName]);

  const {
    data: fetchedData,
    loaded: fetchLoaded,
    error: fetchError,
  } = useFetch(fetchCallback, DEFAULT_FETCHED_DATA);

  const loaded = fetchLoaded && defaultSCLoaded;
  const loadError = fetchError ?? defaultSCError;

  return React.useMemo(
    () => ({
      data: {
        storageClasses: fetchedData.storageClasses,
        defaultStorageClassName: defaultStorageClass?.metadata.name ?? '',
        existingPVCs: fetchedData.existingPVCs,
      },
      loaded,
      loadError,
    }),
    [fetchedData, defaultStorageClass, loaded, loadError],
  );
};

const getDefaultFieldValue = (): NIMPVCFieldValue => ({
  storageMode: NIMPVCStorageMode.NEW,
  pvcName: '',
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

type SubPathFieldProps = {
  subPath: string;
  onSubPathChange: (val: string) => void;
  isDisabled?: boolean;
  idSuffix?: string;
};

const SubPathField: React.FC<SubPathFieldProps> = ({
  subPath,
  onSubPathChange,
  isDisabled,
  idSuffix = '',
}) => (
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
  const existingPVCs = React.useMemo(
    () => externalData?.data.existingPVCs ?? [],
    [externalData?.data.existingPVCs],
  );
  const hasExistingPVCs = existingPVCs.length > 0;

  const existingPVCMap = React.useMemo(
    () => new Map(existingPVCs.map((pvc) => [pvc.name, pvc])),
    [existingPVCs],
  );

  if (!externalData || !externalData.loaded) {
    return (
      <FormGroup label="Storage and deployment option" fieldId="nim-storage-mode" isRequired>
        <Skeleton shape="square" width="100%" height="36px" />
      </FormGroup>
    );
  }

  const storageModeOptions: SimpleSelectOption[] = [
    {
      key: NIMPVCStorageMode.NEW,
      label: 'Deploy the NIM image from a new cluster storage',
    },
    ...(hasExistingPVCs
      ? [
          {
            key: NIMPVCStorageMode.EXISTING,
            label: 'Deploy the NIM image from an existing cluster storage',
          },
        ]
      : []),
  ];

  const storageClassOptions: SimpleSelectOption[] = storageClasses.map((sc) => ({
    key: sc.name,
    label: sc.displayName,
  }));

  const existingPVCOptions: SimpleSelectOption[] = existingPVCs.map((pvc) => ({
    key: pvc.name,
    label: pvc.name,
  }));

  return (
    <FormSection>
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
              subPath: DEFAULT_SUBPATH,
              storageClassName:
                mode === NIMPVCStorageMode.NEW
                  ? defaultStorageClassName || storageClasses[0]?.name || ''
                  : '',
            });
          }}
          isDisabled={isDisabled}
          isFullWidth
        />
        {externalData.loadError && (
          <HelperText>
            <HelperTextItem variant="error">
              There was a problem loading storage data. Please try again later.
            </HelperTextItem>
          </HelperText>
        )}
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

          <SubPathField
            subPath={fieldValue.subPath}
            onSubPathChange={(val) => updateField({ subPath: val })}
            isDisabled={isDisabled}
          />

          <FormGroup label="Storage class" fieldId="nim-storage-class" isRequired>
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
              onChange={(val) => {
                const selectedPVC = existingPVCMap.get(val);
                updateField({
                  pvcName: val,
                  subPath: selectedPVC?.subPath ?? DEFAULT_SUBPATH,
                });
              }}
              isDisabled={isDisabled}
              isFullWidth
              placeholder="Select..."
            />
          </FormGroup>

          <SubPathField
            subPath={fieldValue.subPath}
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
          key: 'subPath',
          label: 'Subpath',
          value: () => value.subPath || '-',
          optional: true,
          isVisible: () => !!value.subPath,
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
