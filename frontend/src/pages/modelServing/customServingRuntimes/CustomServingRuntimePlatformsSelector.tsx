import * as React from 'react';
import { FormGroup } from '@patternfly/react-core';
import { ServingRuntimePlatform } from '~/types';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';

type CustomServingRuntimePlatformsSelectorProps = {
  isSinglePlatformEnabled: boolean;
  isMultiPlatformEnabled: boolean;
  setSelectedPlatforms: (platforms: ServingRuntimePlatform[]) => void;
};

const RuntimePlatformSelectOptionLabels = {
  [ServingRuntimePlatform.SINGLE]: 'Single-model serving platform',
  [ServingRuntimePlatform.MULTI]: 'Multi-model serving platform',
  both: 'Single-model and multi-model serving platforms',
};

const CustomServingRuntimePlatformsSelector: React.FC<
  CustomServingRuntimePlatformsSelectorProps
> = ({ isSinglePlatformEnabled, isMultiPlatformEnabled, setSelectedPlatforms }) => {
  const options: SimpleSelectOption[] = [
    {
      key: ServingRuntimePlatform.SINGLE,
      label: RuntimePlatformSelectOptionLabels[ServingRuntimePlatform.SINGLE],
    },
    {
      key: ServingRuntimePlatform.MULTI,
      label: RuntimePlatformSelectOptionLabels[ServingRuntimePlatform.MULTI],
    },
  ];

  const selection =
    isSinglePlatformEnabled && isMultiPlatformEnabled
      ? 'both'
      : isSinglePlatformEnabled
      ? ServingRuntimePlatform.SINGLE
      : isMultiPlatformEnabled
      ? ServingRuntimePlatform.MULTI
      : '';
  return (
    <FormGroup
      label="Select the model serving platforms this runtime supports"
      fieldId="custom-serving-runtime-selection"
      isRequired
    >
      <SimpleSelect
        dataTestId="custom-serving-runtime-selection"
        aria-label="Select a model serving runtime platform"
        placeholder="Select a value"
        options={options}
        value={selection}
        onChange={(key) => {
          if (key === 'both') {
            setSelectedPlatforms([ServingRuntimePlatform.SINGLE, ServingRuntimePlatform.MULTI]);
          } else if (
            key === ServingRuntimePlatform.SINGLE ||
            key === ServingRuntimePlatform.MULTI
          ) {
            setSelectedPlatforms([key]);
          }
        }}
        popperProps={{ maxWidth: undefined }}
      />
    </FormGroup>
  );
};

export default CustomServingRuntimePlatformsSelector;
