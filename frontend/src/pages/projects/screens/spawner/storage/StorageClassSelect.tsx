import {
  Split,
  SplitItem,
  Label,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Skeleton,
  ValidatedOptions,
  MenuToggleProps,
  LabelGroup,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import React from 'react';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';
import {
  getPossibleStorageClassAccessModes,
  getStorageClassConfig,
} from '#~/pages/storageClasses/utils';
import { StorageClassConfig, StorageClassKind } from '#~/k8sTypes';
import { useDefaultStorageClass } from './useDefaultStorageClass';
import AccessModeLabel from './AccessModeLabel';

type StorageClassSelectProps = {
  storageClasses: StorageClassKind[];
  storageClassesLoaded: boolean;
  selectedStorageClassConfig?: StorageClassConfig;
  storageClassName?: string;
  setStorageClassName: (name: string) => void;
  isRequired?: boolean;
  additionalHelperText?: React.ReactNode;
  disableStorageClassSelect?: boolean;
  menuAppendTo?: HTMLElement | 'inline';
  validated?: ValidatedOptions;
  showDefaultWhenNoConfig?: boolean;
};

const StorageClassSelect: React.FC<StorageClassSelectProps> = ({
  storageClasses,
  storageClassesLoaded,
  selectedStorageClassConfig,
  storageClassName,
  additionalHelperText,
  setStorageClassName,
  isRequired = false,
  disableStorageClassSelect,
  menuAppendTo,
  validated,
  showDefaultWhenNoConfig = false,
}) => {
  const hasStorageClassConfigs = storageClasses.some((sc) => !!getStorageClassConfig(sc));
  const [defaultSc] = useDefaultStorageClass();

  const enabledStorageClasses = storageClasses
    .filter((sc) => getStorageClassConfig(sc)?.isEnabled)
    .toSorted((a, b) => {
      const aConfig = getStorageClassConfig(a);
      const bConfig = getStorageClassConfig(b);
      if (aConfig?.isDefault) {
        return -1;
      }
      if (bConfig?.isDefault) {
        return 1;
      }
      return (aConfig?.displayName || a.metadata.name).localeCompare(
        bConfig?.displayName || b.metadata.name,
      );
    });

  // When showDefaultWhenNoConfig is true and no configs exist, show all storage classes but disable the select
  const shouldShowDefaultOnly = showDefaultWhenNoConfig && !hasStorageClassConfigs;

  // Determine which storage classes to show
  let storageClassesToShow: StorageClassKind[];
  if (shouldShowDefaultOnly) {
    // Show all storage classes when no ODH configs exist and showDefaultWhenNoConfig is true
    storageClassesToShow = storageClasses;
  } else if (disableStorageClassSelect) {
    // Show all storage classes when disabled
    storageClassesToShow = storageClasses;
  } else {
    // Show only enabled storage classes with ODH configs
    storageClassesToShow = enabledStorageClasses;
  }

  const options: SimpleSelectOption[] = storageClassesToShow.map((sc) => {
    const config = getStorageClassConfig(sc);

    return {
      key: sc.metadata.name,
      label: config?.displayName || sc.metadata.name,
      description: (
        <>
          Resource name: {sc.metadata.name}
          <br />
          {config?.description && `Description: ${config.description}`}
        </>
      ),
      isDisabled: !config?.isEnabled,
      dropdownLabel: (
        <Split>
          <SplitItem>{config?.displayName || sc.metadata.name}</SplitItem>
          <SplitItem isFilled />
          <SplitItem>
            {/* If multiple storage classes have `isDefault` set to true,
            prioritize the one returned by useAdminDefaultStorageClass() as the default class */}
            <LabelGroup>
              {getPossibleStorageClassAccessModes(sc).adminSupportedAccessModes.map(
                (accessMode, index) => (
                  <AccessModeLabel key={index} accessMode={accessMode} />
                ),
              )}
              {sc.metadata.name === defaultSc?.metadata.name && (
                <Label isCompact color="green" data-testid="is-default-label">
                  Default class
                </Label>
              )}
            </LabelGroup>
          </SplitItem>
        </Split>
      ),
    };
  });

  if (storageClassesLoaded && !hasStorageClassConfigs && !showDefaultWhenNoConfig) {
    return null;
  }

  const validatedToToggleStatus: Record<ValidatedOptions, MenuToggleProps['status']> = {
    [ValidatedOptions.success]: undefined,
    [ValidatedOptions.error]: 'danger',
    [ValidatedOptions.warning]: 'warning',
    [ValidatedOptions.default]: undefined,
  };

  return storageClassesLoaded ? (
    <FormGroup label="Storage class" fieldId="storage-class" isRequired={isRequired}>
      <SimpleSelect
        dataTestId="storage-classes-selector"
        id="storage-classes-selector"
        isFullWidth
        value={storageClassName}
        options={options}
        onChange={(selection) => {
          setStorageClassName(selection);
        }}
        isDisabled={disableStorageClassSelect || shouldShowDefaultOnly}
        placeholder="Select storage class"
        popperProps={{ appendTo: menuAppendTo }}
        toggleProps={{ status: validated ? validatedToToggleStatus[validated] : undefined }}
        previewDescription={false}
      />
      <FormHelperText>
        {selectedStorageClassConfig && !selectedStorageClassConfig.isEnabled ? (
          <HelperText>
            <HelperTextItem
              data-testid="deprecated-storage-warning"
              variant="warning"
              icon={<ExclamationTriangleIcon />}
            >
              The selected storage class is deprecated.
            </HelperTextItem>
          </HelperText>
        ) : (
          additionalHelperText
        )}
      </FormHelperText>
    </FormGroup>
  ) : (
    <Skeleton />
  );
};

export default StorageClassSelect;
