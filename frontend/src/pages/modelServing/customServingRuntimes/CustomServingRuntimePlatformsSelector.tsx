import * as React from 'react';
import { FormGroup } from '@patternfly/react-core';
import { ServingRuntimePlatform } from '~/types';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';

type CustomServingRuntimePlatformsSelectorProps = {
  isSinglePlatformEnabled: boolean;
  isMultiPlatformEnabled: boolean;
  setSelectedPlatforms: (platforms: ServingRuntimePlatform[]) => void;
};

const RuntimePlatformSelectOptionLabels = {
  [ServingRuntimePlatform.SINGLE]: 'Single model serving platform',
  [ServingRuntimePlatform.MULTI]: 'Multi-model serving platform',
  both: 'Both single and multi-model serving platforms',
};

const CustomServingRuntimePlatformsSelector: React.FC<
  CustomServingRuntimePlatformsSelectorProps
> = ({ isSinglePlatformEnabled, isMultiPlatformEnabled, setSelectedPlatforms }) => {
  const options = [
    {
      key: ServingRuntimePlatform.SINGLE,
      label: RuntimePlatformSelectOptionLabels[ServingRuntimePlatform.SINGLE],
    },
    {
      key: ServingRuntimePlatform.MULTI,
      label: RuntimePlatformSelectOptionLabels[ServingRuntimePlatform.MULTI],
    },
    {
      key: 'both',
      label: RuntimePlatformSelectOptionLabels['both'],
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
      <SimpleDropdownSelect
        id="custom-serving-runtime-selection"
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
      />
    </FormGroup>
  );
};

export default CustomServingRuntimePlatformsSelector;
