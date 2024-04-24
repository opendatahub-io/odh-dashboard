import * as React from 'react';
import { FormGroup } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';

type NIMModelListSectionProps = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  isEditing?: boolean;
};

const NIMModelListSection: React.FC<NIMModelListSectionProps> = ({
  data,
  setData,
  isEditing,
}) => {

  const options = [
    {
      key: 'liama-2-7b',
      label: 'Liama-2-7b',
    },
    {
      key: 'liama-2-13b',
      label: 'Liama-2-13b',
    },
    {
      key: 'liama-2-70b',
      label: 'Liama-2-70b',
    },
    {
      key: 'liama-2-7b-chat',
      label: 'Liama-2-7b-chat',
    },
    {
      key: 'liama-2-13b-chat',
      label: 'Liama-2-13b-chat',
    },
    {
      key: 'liama-2-70b-chat',
      label: 'Liama-2-70b-chat',
    },
    {
      key:'mistral-7b-instruct',
      label: 'Mistral-7b-instruct',
    },
    {
      key:'mixtral-8x7b',
      label: 'Mixtral-8x7b',
    },
    {
      key:'Nemotron-8b-base',
      label: 'Nemotron-8b-base',
    },
    {
      key:'nemotron-43b-chat',
      label: 'Nemotron-43b-chat',
    },
    {
      key:'nemotron-43b-instruct',
      label: 'Nemotron-43b-instruct',
    },
    {
      key:'starcoder',
      label: 'Starcoder',
    },
    {
      key:'Starcoderplus',
      label: 'Starcoderplus',
    }
  ];

  return (
    <FormGroup label="NIM model name" fieldId="nim-model-list-selection" isRequired>
      <SimpleDropdownSelect
        isFullWidth
        isDisabled={isEditing}
        id="nim-model-list-selection"
        dataTestId="nim-model-list-selection"
        aria-label="Select NVIDIA model"
        options={options}
        placeholder={
          isEditing
            ? data.name
            : 'Select NVIDIA model'
        }
        value={data.format.name}
        onChange={(name) => {
          setData('format', { name });
        }}
      />
    </FormGroup>
  );
};

export default NIMModelListSection;
