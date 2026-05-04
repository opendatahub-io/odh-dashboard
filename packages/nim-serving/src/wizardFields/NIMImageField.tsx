import React from 'react';
import { z } from 'zod';
import { FormGroup, HelperText, HelperTextItem } from '@patternfly/react-core';
import TypeaheadSelect, {
  TypeaheadSelectOption,
} from '@odh-dashboard/internal/components/TypeaheadSelect';
import type { ProjectSectionType } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ProjectSection';
import type { WizardField } from '@odh-dashboard/model-serving/types/form-data';
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
  const [modelInfos, setModelInfos] = React.useState<ModelInfo[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error | undefined>();

  React.useEffect(() => {
    if (!projectName) {
      setModelInfos([]);
      setLoaded(true);
      return undefined;
    }

    let cancelled = false;
    setLoaded(false);
    setLoadError(undefined);

    fetchNIMModelNames(projectName)
      .then((infos) => {
        if (!cancelled) {
          setModelInfos(infos);
          setLoaded(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err : new Error(String(err)));
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectName]);

  return React.useMemo(
    () => ({
      data: { modelInfos },
      loaded,
      loadError,
    }),
    [modelInfos, loaded, loadError],
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
        modelInfo.tags.map((tag): TypeaheadSelectOption | null => {
          const normalizedTag = normalizeVersion(tag);
          const optionValue = `${modelInfo.name}-${normalizedTag}`;
          const content = `${modelInfo.displayName} - ${normalizedTag}`;
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
    return (
      options
        .find((opt) => {
          const result = extractModelAndVersion(String(opt.value), modelInfos);
          if (!result) {
            return false;
          }
          const imgName = getNIMImageName(
            result.modelInfo.namespace,
            result.modelInfo.name,
            result.version,
          );
          return imgName === value.imageName;
        })
        ?.value.toString() ?? ''
    );
  }, [value?.imageName, options, modelInfos]);

  const onSelect = React.useCallback(
    (_event: React.MouseEvent | React.KeyboardEvent | undefined, key: string | number) => {
      if (typeof key !== 'string' || isEditing) {
        return;
      }
      const result = extractModelAndVersion(key, modelInfos);
      if (result) {
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

  const hasError = externalData?.loaded && modelInfos.length === 0 && !externalData.loadError;

  return (
    <FormGroup label="NVIDIA NIM" fieldId="nim-image-selection" isRequired>
      <TypeaheadSelect
        selectOptions={options}
        selected={selectedKey}
        isScrollable
        isDisabled={isEditing || isDisabled}
        onSelect={onSelect}
        placeholder={isEditing ? selectedKey : 'Select a NVIDIA NIM to deploy'}
        noOptionsFoundMessage={(filter) => `No results found for "${filter}"`}
        isCreatable={false}
        allowClear={!isEditing}
        onClearSelection={() => {
          if (!isEditing) {
            onChange({ imageName: '' });
          }
        }}
      />
      {externalData?.loadError && (
        <HelperText>
          <HelperTextItem variant="error">
            There was a problem fetching the NIM models. Please try again later.
          </HelperTextItem>
        </HelperText>
      )}
      {hasError && (
        <HelperText>
          <HelperTextItem variant="warning">
            No NVIDIA NIM models found. Please check the NIM Account installation.
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
  isActive: () => true,
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
