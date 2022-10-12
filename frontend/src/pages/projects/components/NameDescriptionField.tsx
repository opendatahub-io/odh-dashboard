import * as React from 'react';
import { FormGroup, TextArea, TextInput } from '@patternfly/react-core';
import { NameDescType } from '../types';

type NameDescriptionFieldProps = {
  nameFieldId: string;
  descriptionFieldId: string;
  data: NameDescType;
  setData: (data: NameDescType) => void;
};

const NameDescriptionField: React.FC<NameDescriptionFieldProps> = ({
  nameFieldId,
  descriptionFieldId,
  data,
  setData,
}) => {
  return (
    <>
      <FormGroup label="Name" fieldId={nameFieldId}>
        <TextInput
          id={nameFieldId}
          name={nameFieldId}
          aria-labelledby={nameFieldId}
          value={data.name}
          onChange={(name) => setData({ ...data, name })}
        />
      </FormGroup>
      <FormGroup label="Description" fieldId={descriptionFieldId}>
        <TextArea
          resizeOrientation="vertical"
          id={descriptionFieldId}
          name={descriptionFieldId}
          aria-labelledby={descriptionFieldId}
          value={data.description}
          onChange={(description) => setData({ ...data, description })}
        />
      </FormGroup>
    </>
  );
};

export default NameDescriptionField;
