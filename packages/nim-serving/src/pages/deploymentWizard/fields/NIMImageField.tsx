import React from 'react';
import { z } from 'zod';
import { Alert, FormGroup, HelperText, HelperTextItem, Skeleton } from '@patternfly/react-core';
import TypeaheadSelect, {
  TypeaheadSelectOption,
} from '@odh-dashboard/ui-core/components/TypeaheadSelect';
import type { ProjectSectionType } from '@odh-dashboard/model-serving/shared/wizard-fields';
import type { WizardField } from '@odh-dashboard/model-serving/shared/types/form-data';
import { NIMModelLocationKey } from '@odh-dashboard/model-serving/shared/wizard-fields';
import { TemplateKind } from '@odh-dashboard/k8s-core';
import { getNIMHardwareProfileFieldOverrides } from './nimHardwareProfileOverrides';
import useNIMAccountStatus, { NIMAccountStatus } from '../../../api/accounts/hooks';
import NIMSettingsLink from '../../projectSettings/NIMSettingsLink';
import { useNIMImages, type NIMImagesData } from '../../../api/images/hooks';
import type { NIMImage } from '../../../api/images/types';
import {
  formatImageString,
  getImageRepository,
  normalizeVersion,
  parseImageString,
} from '../../../api/images/utils';
import { useFetchNIMTemplate } from '../../../api/servingruntime/useFetchNIMTemplate';

export const isNIMImageFieldExternalData = (data: unknown): data is NIMImageFieldExternalData =>
  !!data && typeof data === 'object' && 'nimImages' in data && 'accountStatus' in data;

export type NIMImageFieldExternalData = {
  nimImages: NIMImagesData;
  accountStatus: NIMAccountStatus;
  nimImagesLoaded?: boolean;
  nimTemplate?: TemplateKind;
};

export const useNIMImageFieldExternalData = (dependencies?: {
  project?: { projectName?: string };
  isEditing?: boolean;
}): {
  data: NIMImageFieldExternalData;
  loaded: boolean;
  loadError?: Error;
} => {
  const projectName = dependencies?.project?.projectName;
  const isEditing = dependencies?.isEditing ?? false;
  const {
    status: accountStatus,
    nimAccount,
    loaded: accountLoaded,
    loadError: accountLoadError,
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

  // Load Template early for future yaml previewing
  const {
    data: nimTemplate,
    error: nimTemplateError,
    loaded: nimTemplateLoaded,
  } = useFetchNIMTemplate(nimAccount);

  const accountTerminal =
    !!accountLoadError ||
    accountStatus === NIMAccountStatus.NOT_FOUND ||
    accountStatus === NIMAccountStatus.ERROR;

  // Account failures and terminal Account states must settle the field. Dependent image/template
  // requests cannot load without an Account, and edits must not remain blocked by those requests.
  const loaded =
    isEditing ||
    !projectName ||
    accountTerminal ||
    ((imagesLoaded || !!loadError) && accountLoaded && (nimTemplateLoaded || !!nimTemplateError));

  return React.useMemo(
    () => ({
      data: { nimImages, accountStatus, nimImagesLoaded: imagesLoaded, nimTemplate },
      loaded,
      loadError: accountLoadError ?? loadError ?? nimTemplateError,
    }),
    [
      nimImages,
      accountStatus,
      imagesLoaded,
      nimTemplate,
      loaded,
      accountLoadError,
      loadError,
      nimTemplateError,
    ],
  );
};

export type NIMImageDependencies = {
  project: ProjectSectionType;
  isEditing: boolean;
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

export const getImageOptionKey = (image: NIMImageFieldValue): string =>
  `${image.repository}:${image.tag}`;

export const isNIMImageSelectionLocked = (
  isEditing: boolean | undefined,
  value: NIMImageFieldValue | undefined,
  existingOptionNotFound: boolean,
  isReselectionUnlocked = false,
  catalogLoadedWithImages = false,
): boolean => {
  const imageMissingFromCatalog = catalogLoadedWithImages && existingOptionNotFound;
  const canReselectImage =
    !value || !value.repository || !value.tag || imageMissingFromCatalog || isReselectionUnlocked;
  return !!isEditing && !canReselectImage;
};

export const toNIMImageFieldValue = (image: string): NIMImageFieldValue => {
  const [host, namespace, name, tag] = parseImageString(image);
  return { repository: formatImageString([host, namespace, name, '']), tag };
};

const getNIMImageOptions = (
  images: NIMImage[],
  existingSelection?: NIMImageFieldValue,
): { options: NIMImageOption[]; existingOptionNotFound: boolean } => {
  const seen = new Set<string>();
  const result = images.flatMap((image) => {
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

  let existingOptionNotFound = false;
  // Add the existing value if it's not found in the list
  if (
    existingSelection?.repository &&
    existingSelection.tag &&
    !seen.has(getImageOptionKey(existingSelection))
  ) {
    existingOptionNotFound = true;
    result.unshift({
      value: getImageOptionKey(existingSelection),
      content: getImageOptionKey(existingSelection),
      repository: existingSelection.repository,
      tag: existingSelection.tag,
    });
  }
  return { options: result, existingOptionNotFound };
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

  const { options, existingOptionNotFound } = React.useMemo(
    () => getNIMImageOptions(images, value),
    [images, value],
  );

  const projectName = externalData?.data.nimImages.projectName;
  const editContextKey = isEditing ? projectName ?? '__no_project__' : null;
  const previousEditContextRef = React.useRef<string | null>(editContextKey);
  const reselectionUnlockedRef = React.useRef(false);

  if (previousEditContextRef.current !== editContextKey) {
    reselectionUnlockedRef.current = false;
    previousEditContextRef.current = editContextKey;
  }

  if (isEditing && existingOptionNotFound && externalData?.loaded && images.length > 0) {
    reselectionUnlockedRef.current = true;
  }
  const isReselectionUnlocked = reselectionUnlockedRef.current;

  const selectedKey = value?.repository && value.tag ? getImageOptionKey(value) : undefined;
  const accountStatus = externalData?.data.accountStatus ?? NIMAccountStatus.LOADING;
  const catalogLoadedWithImages = Boolean(
    externalData?.data.nimImagesLoaded &&
      images.length > 0 &&
      accountStatus === NIMAccountStatus.READY,
  );
  const isImageCatalogLoaded = externalData?.data.nimImagesLoaded ?? externalData?.loaded ?? false;
  const canConfirmImageIsMissing = isImageCatalogLoaded && accountStatus === NIMAccountStatus.READY;
  const accountRequestSettled =
    accountStatus !== NIMAccountStatus.LOADING || Boolean(externalData?.loadError);
  const shouldShowImagePreservedMessage =
    isEditing && accountRequestSettled && accountStatus !== NIMAccountStatus.READY;
  const isImageSelectionLocked = isNIMImageSelectionLocked(
    isEditing,
    value,
    existingOptionNotFound,
    isReselectionUnlocked,
    catalogLoadedWithImages,
  );

  const onSelect = React.useCallback(
    (_event: React.MouseEvent | React.KeyboardEvent | undefined, key: string | number) => {
      if (typeof key !== 'string' || isImageSelectionLocked) {
        return;
      }
      const selected = options.find((opt) => String(opt.value) === key);
      if (selected) {
        onChange({ repository: selected.repository, tag: selected.tag });
      }
    },
    [options, onChange, isImageSelectionLocked],
  );

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

  const isAccountLoadFailed =
    accountStatus === NIMAccountStatus.LOADING && Boolean(externalData.loadError);

  if (!isEditing && isAccountLoadFailed) {
    return (
      <Alert variant="danger" isInline title="Unable to load NVIDIA NIM account">
        NVIDIA NIM account information could not be loaded for this project. Ask your project
        administrator to verify that you have permission to view NIM accounts, then try again.
      </Alert>
    );
  }

  const isNIMUnconfigured =
    !isEditing &&
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
        dataTestId="nim-image-select"
        toggleWidth="450px"
        selectOptions={options}
        selected={selectedKey}
        isScrollable
        isDisabled={isImageSelectionLocked || isDisabled}
        onSelect={onSelect}
        placeholder="Select NVIDIA NIM image"
        noOptionsFoundMessage={(filter) => `No results found for "${filter}"`}
        isCreatable={false}
        allowClear={!isImageSelectionLocked}
        onClearSelection={() => {
          if (!isImageSelectionLocked) {
            onChange({ repository: '', tag: '' });
          }
        }}
      />
      {shouldShowImagePreservedMessage && (
        <HelperText>
          <HelperTextItem variant="error">
            NVIDIA NIM account information could not be loaded. The deployed image is preserved but
            cannot be changed.
          </HelperTextItem>
        </HelperText>
      )}
      {!isEditing && externalData.loadError && (
        <HelperText>
          <HelperTextItem variant="error">
            There was a problem fetching the NIM models. Please try again later.
          </HelperTextItem>
        </HelperText>
      )}
      {existingOptionNotFound && canConfirmImageIsMissing && !externalData.loadError && (
        <HelperText>
          <HelperTextItem variant="warning" data-testid="nim-image-not-found-warning">
            The existing NIM image was not found. The deployment may not work as expected.
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
    resolveDependencies: (formData, initialData) => ({
      project: formData.project,
      isEditing: initialData?.isEditing ?? false,
    }),
    getFieldOverrides: getNIMHardwareProfileFieldOverrides,
  },
  component: NIMImageFieldComponent,
  externalDataHook: useNIMImageFieldExternalData,
};
