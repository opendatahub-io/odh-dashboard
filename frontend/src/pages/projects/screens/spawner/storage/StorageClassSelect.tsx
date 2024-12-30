import {
  Split,
  SplitItem,
  Label,
  FormGroup,
  Alert,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Skeleton,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import React from 'react';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
import useStorageClasses from '~/concepts/k8s/useStorageClasses';
import { getStorageClassConfig } from '~/pages/storageClasses/utils';
import useDefaultStorageClass from './useDefaultStorageClass';

type StorageClassSelectProps = {
  storageClassName?: string;
  setStorageClassName: (name: string) => void;
  disableStorageClassSelect?: boolean;
  menuAppendTo?: HTMLElement | 'inline';
};

const StorageClassSelect: React.FC<StorageClassSelectProps> = ({
  storageClassName,
  setStorageClassName,
  disableStorageClassSelect,
  menuAppendTo,
}) => {
  const [storageClasses, storageClassesLoaded] = useStorageClasses();
  const hasStorageClassConfigs = storageClasses.some((sc) => !!getStorageClassConfig(sc));
  const [defaultSc] = useDefaultStorageClass();

  const enabledStorageClasses = storageClasses
    .filter((sc) => getStorageClassConfig(sc)?.isEnabled === true)
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

  const selectedStorageClass = storageClasses.find((sc) => sc.metadata.name === storageClassName);
  const selectedStorageClassConfig = selectedStorageClass
    ? getStorageClassConfig(selectedStorageClass)
    : undefined;

  const options: SimpleSelectOption[] = (
    disableStorageClassSelect ? storageClasses : enabledStorageClasses
  ).map((sc) => {
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
            prioritize the one returned by useDefaultStorageClass() as the default class */}
            {sc.metadata.name === defaultSc?.metadata.name && (
              <Label isCompact color="green" data-testid="is-default-label">
                Default class
              </Label>
            )}
          </SplitItem>
        </Split>
      ),
    };
  });

  if (storageClassesLoaded && !hasStorageClassConfigs) {
    return null;
  }

  return hasStorageClassConfigs ? (
    <FormGroup label="Storage class" fieldId="storage-class">
      <SimpleSelect
        dataTestId="storage-classes-selector"
        id="storage-classes-selector"
        isFullWidth
        value={storageClassName}
        options={options}
        onChange={(selection) => {
          setStorageClassName(selection);
        }}
        isDisabled={disableStorageClassSelect || !storageClassesLoaded}
        placeholder="Select storage class"
        popperProps={{ appendTo: menuAppendTo }}
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
          <Alert
            variant="info"
            title="The storage class cannot be changed after creation."
            isInline
            isPlain
          />
        )}
      </FormHelperText>
    </FormGroup>
  ) : (
    <Skeleton />
  );
};

export default StorageClassSelect;
