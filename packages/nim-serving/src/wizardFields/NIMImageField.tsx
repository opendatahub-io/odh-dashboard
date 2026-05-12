import React from 'react';
import { z } from 'zod';
import { Alert, FormGroup, HelperText, HelperTextItem, Spinner } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import TypeaheadSelect, {
  TypeaheadSelectOption,
} from '@odh-dashboard/internal/components/TypeaheadSelect';
import useFetch, {
  NotReadyError,
  type FetchStateCallbackPromise,
} from '@odh-dashboard/internal/utilities/useFetch';
import { useAccessReview } from '@odh-dashboard/internal/api/useAccessReview';
import type { ProjectSectionType } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ProjectSection';
import type { WizardField } from '@odh-dashboard/model-serving/types/form-data';
import { NIMModelLocationKey } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/modelLocationFields/NIMModelLocation';
import useNIMAccountStatus, { NIMAccountStatus } from '../api/accounts/hooks';
import {
  fetchNIMModelNames,
  getNIMImageName,
  normalizeVersion,
  type ModelInfo,
} from '../utils/nimModels';

// --- Dependencies ---

export type NIMImageDependencies = {
  project: ProjectSectionType;
};

// --- External data hook ---

export type NIMImagesData = {
  modelInfos: ModelInfo[];
  projectName?: string;
};

export const useNIMImages = (
  dependencies?: NIMImageDependencies,
): {
  data: NIMImagesData;
  loaded: boolean;
  loadError?: Error;
} => {
  const project = dependencies?.project;
  const projectName = project?.projectName;

  const fetchCallback = React.useCallback<FetchStateCallbackPromise<ModelInfo[]>>(() => {
    if (!projectName) {
      return Promise.reject(new NotReadyError('No project selected'));
    }
    return fetchNIMModelNames(projectName);
  }, [projectName]);

  const { data: modelInfos, loaded, error: loadError } = useFetch(fetchCallback, []);

  return React.useMemo(
    () => ({
      data: { modelInfos, projectName },
      loaded,
      loadError,
    }),
    [modelInfos, projectName, loaded, loadError],
  );
};

// --- Component ---

export type NIMImageFieldValue = {
  imageName: string;
};

const nimImageFieldSchema = z.object({
  imageName: z.string().min(1, 'NIM image is required'),
});

type NIMImageFieldComponentProps = {
  value?: NIMImageFieldValue;
  onChange: (value: NIMImageFieldValue) => void;
  externalData?: { data: NIMImagesData; loaded: boolean; loadError?: Error };
  isEditing?: boolean;
  isDisabled?: boolean;
};

const extractModelAndVersion = (
  key: string,
  modelInfos: ModelInfo[],
): { modelInfo: ModelInfo; version: string } | null => {
  const matchedModels = modelInfos.filter((model) => key.startsWith(`${model.name}-`));
  if (matchedModels.length === 0) {
    return null;
  }
  const modelInfo = matchedModels.reduce((longest, current) =>
    current.name.length > longest.name.length ? current : longest,
  );
  const version = key.slice(modelInfo.name.length + 1);
  return { modelInfo, version };
};

const NIMImageFieldComponent: React.FC<NIMImageFieldComponentProps> = ({
  value,
  onChange,
  externalData,
  isEditing,
  isDisabled,
}) => {
  const modelInfos = React.useMemo(
    () => externalData?.data.modelInfos ?? [],
    [externalData?.data.modelInfos],
  );

  const options: TypeaheadSelectOption[] = React.useMemo(() => {
    const seen = new Set<string>();
    return modelInfos
      .flatMap((modelInfo) =>
        (modelInfo.tags ?? []).map((tag): TypeaheadSelectOption | null => {
          const normalizedTag = normalizeVersion(tag);
          const optionValue = `${modelInfo.name}-${normalizedTag}`;
          const content = `${modelInfo.displayName ?? modelInfo.name} - ${normalizedTag}`;
          if (seen.has(optionValue)) {
            return null;
          }
          seen.add(optionValue);
          return { value: optionValue, content };
        }),
      )
      .filter((option): option is TypeaheadSelectOption => option !== null);
  }, [modelInfos]);

  const selectedKey = React.useMemo(() => {
    if (!value?.imageName) {
      return '';
    }
    const matched = options.find((opt) => {
      const result = extractModelAndVersion(String(opt.value), modelInfos);
      if (!result || !result.modelInfo.namespace) {
        return false;
      }
      const imgName = getNIMImageName(
        result.modelInfo.namespace,
        result.modelInfo.name,
        result.version,
      );
      return imgName === value.imageName;
    });
    return matched?.value.toString() ?? value.imageName;
  }, [value?.imageName, options, modelInfos]);

  const onSelect = React.useCallback(
    (_event: React.MouseEvent | React.KeyboardEvent | undefined, key: string | number) => {
      if (typeof key !== 'string' || isEditing) {
        return;
      }
      const result = extractModelAndVersion(key, modelInfos);
      if (result && result.modelInfo.namespace) {
        onChange({
          imageName: getNIMImageName(
            result.modelInfo.namespace,
            result.modelInfo.name,
            result.version,
          ),
        });
      }
    },
    [modelInfos, onChange, isEditing],
  );

  const projectName = externalData?.data.projectName;

  const { status: accountStatus, loaded: accountLoaded } = useNIMAccountStatus(projectName ?? '');

  const [canViewSettings, rbacLoaded] = useAccessReview(
    {
      group: 'rbac.authorization.k8s.io',
      resource: 'rolebindings',
      namespace: projectName ?? '',
      verb: 'list',
    },
    !!projectName,
  );

  if (!projectName) {
    return (
      <Alert variant="info" isInline title="NVIDIA Inference Microservices (NIM image)">
        Select a project to load available NIM images.
      </Alert>
    );
  }

  const isNIMUnconfigured =
    accountLoaded &&
    (accountStatus === NIMAccountStatus.NOT_FOUND || accountStatus === NIMAccountStatus.ERROR) &&
    modelInfos.length === 0;

  if (isNIMUnconfigured) {
    const isInvalidKey = accountStatus === NIMAccountStatus.ERROR;

    const settingsAction = !rbacLoaded ? (
      <Spinner size="sm" />
    ) : canViewSettings ? (
      <Link to={`/projects/${projectName}?section=settings`}>Configure in project settings</Link>
    ) : (
      'Ask your project administrator to configure NVIDIA NIM.'
    );

    return (
      <Alert variant="danger" isInline title="NVIDIA Inference Microservices (NIM image)">
        {isInvalidKey
          ? 'The NVIDIA NIM key for this project is invalid and needs to be replaced. '
          : 'No NVIDIA NIM key has been configured for this project. '}
        {settingsAction}
      </Alert>
    );
  }

  return (
    <FormGroup
      label="NVIDIA Inference Microservices (NIM image)"
      fieldId="nim-image-selection"
      isRequired
    >
      <TypeaheadSelect
        toggleWidth="450px"
        selectOptions={options}
        selected={selectedKey}
        isScrollable
        isDisabled={isEditing || isDisabled}
        onSelect={onSelect}
        placeholder={isEditing ? selectedKey : 'Select NVIDIA NIM image'}
        noOptionsFoundMessage={(filter) => `No results found for "${filter}"`}
        isCreatable={false}
        allowClear={!isEditing}
        onClearSelection={() => {
          if (!isEditing) {
            onChange({ imageName: '' });
          }
        }}
      />
      {externalData.loadError && (
        <HelperText>
          <HelperTextItem variant="error">
            There was a problem fetching the NIM models. Please try again later.
          </HelperTextItem>
        </HelperText>
      )}
    </FormGroup>
  );
};

// --- Field definition ---

export type NIMImageFieldType = WizardField<
  NIMImageFieldValue,
  NIMImagesData,
  NIMImageDependencies
>;

export const NIMImageFieldWizardField: NIMImageFieldType = {
  id: 'nim-serving/nimImage',
  step: 'modelSource',
  type: 'addition',
  isActive: (wizardFormData) =>
    wizardFormData.modelLocationData?.data?.type === NIMModelLocationKey,
  reducerFunctions: {
    setFieldData: (value: NIMImageFieldValue) => value,
    getInitialFieldData: (existingFieldData?: NIMImageFieldValue): NIMImageFieldValue =>
      existingFieldData ?? { imageName: '' },
    validationSchema: nimImageFieldSchema,
    resolveDependencies: (formData) => ({ project: formData.project }),
  },
  component: NIMImageFieldComponent,
  externalDataHook: useNIMImages,
};
