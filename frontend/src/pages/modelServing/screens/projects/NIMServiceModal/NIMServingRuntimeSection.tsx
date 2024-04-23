import * as React from 'react';
import {
  FormGroup,
} from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';


type NIMServingRuntimeSectionProps = {
  data: CreatingServingRuntimeObject;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
  isEditing?: boolean;
};

const NIMServingRuntimeSection: React.FC<NIMServingRuntimeSectionProps> = ({
  data,
  setData,
  isEditing,
}) => {

  const options = [
    {
      key: 'nvidia-nim-serving-runtime',
      label: 'NVIDIA NIM serving runtime',
    },
  ];

  return (
    <FormGroup label="Serving runtime" fieldId="nim-serving-runtime-section" isRequired>
      <SimpleDropdownSelect
        isFullWidth
        isDisabled={isEditing}
        id="serving-runtime-template-selection"
        dataTestId="serving-runtime-template-selection"
        aria-label="Select serving runtime"
        options={options}
        placeholder={
          isEditing
            ? data.servingRuntimeTemplateName
            : 'Select serving runtime'
        }
        value={data.servingRuntimeTemplateName}
        onChange={(name) => {
          setData('servingRuntimeTemplateName', name);
        }}
      />
    </FormGroup>
  );
};

export default NIMServingRuntimeSection;
