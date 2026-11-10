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
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import TypeaheadSelect from '@odh-dashboard/ui-core/components/TypeaheadSelect';
import NumberInputWrapper from '@odh-dashboard/ui-core/components/NumberInputWrapper';
import type { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';
import type { TypeaheadSelectOption } from '@odh-dashboard/ui-core/components/TypeaheadSelect';
import type { ProjectSectionType } from '@odh-dashboard/model-serving/shared/wizard-fields';
import type { WizardField } from '@odh-dashboard/model-serving/shared/types/form-data';
import { NIMModelLocationKey } from '@odh-dashboard/model-serving/shared/wizard-fields';
import { getStorageClasses } from '@odh-dashboard/internal/api/k8s/storageClasses';
import { getDashboardPvcs } from '@odh-dashboard/internal/api/k8s/pvcs';
import K8sNameDescriptionField from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import useFetch, {
  FetchStateCallbackPromise,
  NotReadyError,
} from '@odh-dashboard/ui-core/hooks/useFetch';
import {
  handleUpdateLogic,
  isK8sNameDescriptionDataValid,
  LimitNameResourceType,
  setupDefaults,
  translateDisplayNameForK8s,
  type K8sNameDescriptionFieldData,
} from '@odh-dashboard/k8s-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { useDefaultStorageClass } from '@odh-dashboard/internal/pages/projects/screens/spawner/storage/useDefaultStorageClass';
import { categorizePVCs, type ExistingPVCOption } from './nimPVCUtils';
import { NIM_PVC_STORAGE_FIELD_ID } from '../../../constants';

export {
  NIM_PVC_ANNOTATION,
  NIM_PVC_SUBPATH_ANNOTATION,
} from '../../clusterStorage/clusterStorage';

export enum NIMPVCStorageMode {
  NEW = 'new',
  EXISTING = 'existing',
}

export type NIMPVCFieldValue = {
  storageMode: NIMPVCStorageMode;
  newPvcNameData?: K8sNameDescriptionFieldData;
  existingPvcDisplayName: string;
  existingPvcK8sName?: string;
  subPath: string;
  storageClassName: string;
  storageSizeGi: number;
};

const DEFAULT_SUBPATH = '';
const DEFAULT_STORAGE_SIZE_GI = 50;
const MIN_STORAGE_SIZE_GI = 1;
const defaultNewPvcNameData = (): K8sNameDescriptionFieldData =>
  setupDefaults({
    initialData: { name: '', k8sName: '' },
    limitNameResourceType: LimitNameResourceType.PVC,
    editableK8sName: true,
  });

export const getNIMPVCDisplayName = (fieldData: NIMPVCFieldValue): string =>
  fieldData.newPvcNameData ? fieldData.newPvcNameData.name : fieldData.existingPvcDisplayName;

export const getNIMPVCK8sName = (fieldData: NIMPVCFieldValue): string =>
  fieldData.newPvcNameData
    ? fieldData.newPvcNameData.k8sName.value
    : fieldData.existingPvcK8sName || translateDisplayNameForK8s(fieldData.existingPvcDisplayName);

const nimPVCFieldSchema = z
  .object({
    storageMode: z.nativeEnum(NIMPVCStorageMode),
    newPvcNameData: z
      .custom<K8sNameDescriptionFieldData>(
        (value): value is K8sNameDescriptionFieldData =>
          typeof value === 'object' && value !== null && 'name' in value && 'k8sName' in value,
      )
      .optional(),
    existingPvcDisplayName: z.string(),
    existingPvcK8sName: z.string().optional(),
    subPath: z.string(),
    storageClassName: z.string(),
    storageSizeGi: z.number().min(MIN_STORAGE_SIZE_GI, 'Storage size must be at least 1 GiB'),
  })
  .superRefine((data, ctx) => {
    if (data.storageMode === NIMPVCStorageMode.EXISTING) {
      if (!(data.existingPvcK8sName || data.existingPvcDisplayName)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Cluster storage name is required',
          path: ['existingPvcDisplayName'],
        });
      }
      return;
    }

    if (!data.newPvcNameData || !isK8sNameDescriptionDataValid(data.newPvcNameData)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid resource name',
        path: ['newPvcNameData', 'k8sName'],
      });
    }
    if (!data.storageClassName) {
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
  existingPVCs: ExistingPVCOption[];
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
      // Don't filter out PVCs without a `opendatahub.io/dashboard=true`, old modal NIMs didn't add it
      getDashboardPvcs(projectName, null),
    ]);

    return {
      storageClasses: scList.map((sc) => ({
        name: sc.metadata.name,
        displayName: sc.metadata.annotations?.['openshift.io/display-name'] || sc.metadata.name,
      })),
      existingPVCs: categorizePVCs(pvcList),
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
  newPvcNameData: defaultNewPvcNameData(),
  existingPvcDisplayName: '',
  existingPvcK8sName: '',
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
  description?: string;
};

export const SubPathField: React.FC<SubPathFieldProps> = ({
  subPath,
  onSubPathChange,
  isDisabled,
  description = 'Provide a subdirectory if you have multiple models stored in the same cluster storage. If blank, the storage root will be used.',
}) => (
  <FormGroup label="Subpath" fieldId="nim-subpath" className="pf-v6-u-pt-md">
    <HelperText>
      <HelperTextItem>{description}</HelperTextItem>
    </HelperText>
    <TextInput
      id="nim-subpath"
      data-testid="nim-subpath-input"
      value={subPath}
      onChange={(_event: React.FormEvent<HTMLInputElement>, val: string) => onSubPathChange(val)}
      placeholder="/"
      isDisabled={isDisabled}
    />
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
      <FormGroup label="Deployment storage" fieldId="nim-storage-mode" isRequired>
        <Skeleton shape="square" width="100%" height="36px" />
      </FormGroup>
    );
  }

  const storageModeOptions: SimpleSelectOption[] = [
    {
      key: NIMPVCStorageMode.NEW,
      label: 'Create new cluster storage',
    },
    ...(hasExistingPVCs
      ? [
          {
            key: NIMPVCStorageMode.EXISTING,
            label: 'Use existing cluster storage',
          },
        ]
      : []),
  ];

  const storageClassOptions: SimpleSelectOption[] = storageClasses.map((sc) => ({
    key: sc.name,
    label: sc.displayName,
  }));

  const existingPVCOptions: TypeaheadSelectOption[] = existingPVCs.map((pvc) => ({
    value: pvc.name,
    content: pvc.displayName,
    group: pvc.category,
  }));

  const { newPvcNameData } = fieldValue;

  return (
    <FormSection>
      <FormGroup label="Deployment storage" fieldId="nim-storage-mode" isRequired>
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
              newPvcNameData: mode === NIMPVCStorageMode.NEW ? defaultNewPvcNameData() : undefined,
              existingPvcDisplayName: '',
              existingPvcK8sName: '',
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

      <div className="pf-v6-u-pl-xl">
        {fieldValue.storageMode === NIMPVCStorageMode.NEW && newPvcNameData ? (
          <>
            <K8sNameDescriptionField
              data={newPvcNameData}
              onDataChange={(key, nextValue) => {
                const nextData = handleUpdateLogic(newPvcNameData)(key, nextValue);
                updateField({ newPvcNameData: nextData });
              }}
              dataTestId="nim-pvc-name"
              nameLabel="Cluster storage name"
              nameHelperTextAbove="This cluster storage can be reused for future deployments of this NIM image."
              hideDescription
            />

            <SubPathField
              subPath={fieldValue.subPath}
              onSubPathChange={(val) => updateField({ subPath: val })}
              isDisabled={isDisabled}
            />

            <FormGroup
              label="Storage class"
              fieldId="nim-storage-class"
              isRequired
              className="pf-v6-u-pt-md"
            >
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

            <FormGroup
              label="NVIDIA NIM storage size"
              fieldId="nim-storage-size"
              isRequired
              className="pf-v6-u-pt-md"
            >
              <HelperText>
                <HelperTextItem>
                  Specify the size of the storage. Make sure it is larger than the NIM image size
                  specified by NVIDIA.
                </HelperTextItem>
              </HelperText>
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
            </FormGroup>
          </>
        ) : (
          <>
            <FormGroup label="Cluster storage name" fieldId="nim-existing-pvc" isRequired>
              <TypeaheadSelect
                dataTestId="nim-existing-pvc-select"
                selectOptions={existingPVCOptions}
                selected={
                  fieldValue.existingPvcK8sName || fieldValue.existingPvcDisplayName || undefined
                }
                onSelect={(_, val) => {
                  const claimName = String(val);
                  if (
                    claimName ===
                    (fieldValue.existingPvcK8sName || fieldValue.existingPvcDisplayName)
                  ) {
                    return;
                  }
                  const selectedPVC = existingPVCMap.get(claimName);
                  updateField({
                    existingPvcDisplayName: selectedPVC?.displayName ?? claimName,
                    existingPvcK8sName: claimName,
                    subPath: selectedPVC?.subPath ?? DEFAULT_SUBPATH,
                  });
                }}
                isDisabled={isDisabled}
                isRequired={false}
                placeholder="Select cluster storage..."
                collapsibleGroupsThreshold={12}
                maxMenuHeight="300px"
              />
            </FormGroup>

            <SubPathField
              subPath={fieldValue.subPath}
              onSubPathChange={(val) => updateField({ subPath: val })}
              isDisabled={isDisabled}
            />
          </>
        )}
      </div>
    </FormSection>
  );
};

export type NIMPVCFieldType = WizardField<NIMPVCFieldValue, NIMPVCExternalData, NIMPVCDependencies>;

export const NIMPVCFieldWizardField: NIMPVCFieldType = {
  id: NIM_PVC_STORAGE_FIELD_ID,
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
          key: 'existingPvcDisplayName',
          label: 'Cluster storage name',
          value: () => getNIMPVCDisplayName(value) || '-',
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
