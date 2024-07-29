import * as React from 'react';
import { useEffect, useState } from 'react';
import { FormGroup } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import {
  CreatingInferenceServiceObject,
  CreatingServingRuntimeObject,
} from '~/pages/modelServing/screens/types';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import { fetchNIMModelNames } from '~/pages/modelServing/screens/projects/utils';

type NIMModelListSectionProps = {
  inferenceServiceData: CreatingInferenceServiceObject;
  setInferenceServiceData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  setServingRuntimeData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
  isEditing?: boolean;
};

const NIMModelListSection: React.FC<NIMModelListSectionProps> = ({
  inferenceServiceData,
  setInferenceServiceData,
  setServingRuntimeData,
  isEditing,
}) => {
  const [options, setOptions] = useState<{ key: string; label: string }[]>([]);

  useEffect(() => {
    const getModelNames = async () => {
      const modelInfos = await fetchNIMModelNames();
      if (modelInfos !== undefined) {
        const fetchedOptions = modelInfos.map((modelInfo) => ({
          key: modelInfo.name,
          label: `${modelInfo.displayName} - ${modelInfo.latestTag}`,
        }));
        setOptions(fetchedOptions);
      }
    };
    getModelNames();
  }, []);

  const getSupportedModelFormatsInfo = (name: string) => {
    const modelInfo = options.find((option) => option.key === name);
    if (modelInfo) {
      return {
        name: modelInfo.key,
        version: modelInfo.label.split(' - ')[1],
      };
    }
    return { name: '', version: '' };
  };

  const getNIMImageName = (name: string) => {
    const imageInfo = options.find((option) => option.key === name);
    if (imageInfo) {
      return `nvcr.io/nim/meta/${name}:${imageInfo.label.split(' - ')[1]}`;
    }
    return '';
  };

  return (
    <FormGroup label="NIM model name" fieldId="nim-model-list-selection" isRequired>
      <SimpleDropdownSelect
        isFullWidth
        isDisabled={isEditing}
        id="nim-model-list-selection"
        dataTestId="nim-model-list-selection"
        aria-label="Select NVIDIA model"
        options={options}
        placeholder={isEditing ? inferenceServiceData.name : 'Select NVIDIA model'}
        value={inferenceServiceData.format.name}
        onChange={(name) => {
          setServingRuntimeData('supportedModelFormatsInfo', getSupportedModelFormatsInfo(name));
          setServingRuntimeData('imageName', getNIMImageName(name));
          setInferenceServiceData('format', { name });
        }}
      />
    </FormGroup>
  );
};

export default NIMModelListSection;
