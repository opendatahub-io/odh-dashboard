import * as React from 'react';
import { FormGroup, Stack, StackItem, TextArea, TextInput } from '@patternfly/react-core';
import { NameDescType } from '../types';

type NameDescriptionFieldProps = {
  nameFieldId: string;
  descriptionFieldId: string;
  data: NameDescType;
  setData: (data: NameDescType) => void;
  autoFocusName?: boolean;
};

const NameDescriptionField: React.FC<NameDescriptionFieldProps> = ({
  nameFieldId,
  descriptionFieldId,
  data,
  setData,
  autoFocusName,
}) => {
  const autoSelectNameRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (autoFocusName) {
      autoSelectNameRef.current?.focus();
    }
  }, [autoFocusName]);

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup label="Name" isRequired fieldId={nameFieldId}>
          <TextInput
            isRequired
            ref={autoSelectNameRef}
            id={nameFieldId}
            name={nameFieldId}
            aria-labelledby={nameFieldId}
            value={data.name}
            onChange={(name) => setData({ ...data, name })}
          />
        </FormGroup>
      </StackItem>
      <StackItem>
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
      </StackItem>
    </Stack>
  );
};

export default NameDescriptionField;
