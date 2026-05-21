import React from 'react';
import { z } from 'zod';
import { Alert, FormGroup, HelperText, HelperTextItem, Skeleton } from '@patternfly/react-core';
import TypeaheadSelect, {
  TypeaheadSelectOption,
} from '@odh-dashboard/internal/components/TypeaheadSelect';
import type { ProjectSectionType } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ProjectSection';
import type { WizardField } from '@odh-dashboard/model-serving/types/form-data';
import { NIMModelLocationKey } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/modelLocationFields/NIMModelLocation';
import useNIMAccountStatus, { NIMAccountStatus } from '../../../api/accounts/hooks';
import NIMSettingsLink from '../../projectSettings/NIMSettingsLink';
import { useNIMImages, type NIMImagesData } from '../../../api/images/hooks';
import type { NIMImage } from '../../../api/images/types';
import { getImageRepository, normalizeVersion } from '../../../api/images/utils';

export type NIMImageFieldExternalData = {
  nimImages: NIMImagesData;
  accountStatus: NIMAccountStatus;
};

const useNIMImageFieldExternalData = (dependencies?: {
  project?: { projectName?: string };
}): {
  data: NIMImageFieldExternalData;
  loaded: boolean;
  loadError?: Error;
} => {
  const projectName = dependencies?.project?.projectName;
  const {
    status: accountStatus,
    nimAccount,
    loaded: accountLoaded,
  } = useNIMAccountStatus(projectName);

  const {
    data: nimImages,
    loaded: imagesLoaded,
    loadError,
  } = useNIMImages({
    project: dependencies?.project,
    nimAccount,
    accountLoaded,
  });

  const loaded = !projectName || (imagesLoaded && accountLoaded);

  return React.useMemo(
    () => ({
      data: { nimImages, accountStatus },
      loaded,
      loadError,
    }),
    [nimImages, accountStatus, loaded, loadError],
  );
};

export type NIMImageDependencies = {
  project: ProjectSectionType;
};

export type NIMImageFieldValue = {
  repository: string;
  tag: string;
};

const nimImageFieldSchema = z.object({
  repository: z.string().min(1, 'NIM image is required'),
  tag: z.string().min(1, 'NIM image tag is required'),
});

type NIMImageOption = TypeaheadSelectOption & NIMImageFieldValue;

const getImageOptionKey = (image: NIMImageFieldValue): string => `${image.repository}:${image.tag}`;

const getNIMImageOptions = (images: NIMImage[]): NIMImageOption[] => {
  const seen = new Set<string | number>();
  return images.flatMap((image) => {
    if (!image.namespace) {
      return [];
    }
    const repository = getImageRepository(image.namespace, image.name);
    return (image.tags ?? []).reduce<NIMImageOption[]>((acc, tag) => {
      const normalizedTag = normalizeVersion(tag);
      const optionValue = getImageOptionKey({ repository, tag: normalizedTag });
      if (!seen.has(optionValue)) {
        seen.add(optionValue);
        acc.push({
          value: optionValue,
          content: `${image.displayName ?? image.name} - ${normalizedTag}`,
          repository,
          tag: normalizedTag,
        });
      }
      return acc;
    }, []);
  });
};

type NIMImageFieldComponentProps = {
  value?: NIMImageFieldValue;
  onChange: (value: NIMImageFieldValue) => void;
  externalData?: { data: NIMImageFieldExternalData; loaded: boolean; loadError?: Error };
  isEditing?: boolean;
  isDisabled?: boolean;
};

const NIMImageFieldComponent: React.FC<NIMImageFieldComponentProps> = ({
  value,
  onChange,
  externalData,
  isEditing,
  isDisabled,
}) => {
  const images = React.useMemo(
    () => externalData?.data.nimImages.images ?? [],
    [externalData?.data.nimImages.images],
  );

  const options: NIMImageOption[] = React.useMemo(() => getNIMImageOptions(images), [images]);

  const selectedKey = React.useMemo(() => {
    if (!value?.repository) {
      return '';
    }
    const currentKey = getImageOptionKey(value);
    const matched = options.find((opt) => String(opt.value) === currentKey);
    return matched ? String(matched.value) : currentKey;
  }, [value, options]);

  const onSelect = React.useCallback(
    (_event: React.MouseEvent | React.KeyboardEvent | undefined, key: string | number) => {
      if (typeof key !== 'string' || isEditing) {
        return;
      }
      const selected = options.find((opt) => String(opt.value) === key);
      if (selected) {
        onChange({ repository: selected.repository, tag: selected.tag });
      }
    },
    [options, onChange, isEditing],
  );

  const projectName = externalData?.data.nimImages.projectName;
  const accountStatus = externalData?.data.accountStatus ?? NIMAccountStatus.LOADING;

  if (!externalData || !externalData.loaded) {
    return (
      <FormGroup label="NIM image" fieldId="nim-image-selection" isRequired>
        <Skeleton shape="square" width="450px" height="36px" />
      </FormGroup>
    );
  }

  if (!projectName) {
    return (
      <Alert variant="info" isInline title="No project selected">
        Select a project to load available NIM images.
      </Alert>
    );
  }

  const isNIMUnconfigured =
    (accountStatus === NIMAccountStatus.NOT_FOUND || accountStatus === NIMAccountStatus.ERROR) &&
    images.length === 0;

  if (isNIMUnconfigured) {
    const isInvalidKey = accountStatus === NIMAccountStatus.ERROR;
    return (
      <Alert
        variant="danger"
        isInline
        title={isInvalidKey ? 'Invalid NIM API key' : 'No NIM API key'}
      >
        {isInvalidKey
          ? 'The NVIDIA NIM key for this project is invalid and needs to be replaced. '
          : 'No NVIDIA NIM key has been configured for this project. '}
        <NIMSettingsLink projectName={projectName} />
      </Alert>
    );
  }

  return (
    <FormGroup label="NIM image" fieldId="nim-image-selection" isRequired>
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
            onChange({ repository: '', tag: '' });
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

export type NIMImageFieldType = WizardField<
  NIMImageFieldValue,
  NIMImageFieldExternalData,
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
      existingFieldData ?? { repository: '', tag: '' },
    validationSchema: nimImageFieldSchema,
    resolveDependencies: (formData) => ({ project: formData.project }),
  },
  component: NIMImageFieldComponent,
  externalDataHook: useNIMImageFieldExternalData,
};
