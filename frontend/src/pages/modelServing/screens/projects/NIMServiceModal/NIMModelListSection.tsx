import * as React from 'react';
import { useEffect, useState } from 'react';
import { FormGroup } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import { fetchNIMModelNames } from '~/pages/modelServing/screens/projects/utils';

type NIMModelListSectionProps = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  isEditing?: boolean;
};

const NIMModelListSection: React.FC<NIMModelListSectionProps> = ({ data, setData, isEditing }) => {
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

  return (
    <FormGroup label="NIM model name" fieldId="nim-model-list-selection" isRequired>
      <SimpleDropdownSelect
        isFullWidth
        isDisabled={isEditing}
        id="nim-model-list-selection"
        dataTestId="nim-model-list-selection"
        aria-label="Select NVIDIA model"
        options={options}
        placeholder={isEditing ? data.name : 'Select NVIDIA model'}
        value={data.format.name}
        onChange={(name) => {
          setData('format', { name });
        }}
      />
    </FormGroup>
  );
};

export default NIMModelListSection;
