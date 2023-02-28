import * as React from 'react';
import {
  FormGroup,
  HelperText,
  HelperTextItem,
  Select,
  SelectOption,
} from '@patternfly/react-core';
import { NotebookSize } from '~/types';

type SizeSelectFieldProps = {
  value: NotebookSize;
  setValue: (newValue: string) => void;
  sizes: NotebookSize[];
};

const SizeSelectField: React.FC<SizeSelectFieldProps> = ({ value, setValue, sizes }) => {
  const [sizeDropdownOpen, setSizeDropdownOpen] = React.useState(false);

  const sizeOptions = () =>
    sizes.map((size) => {
      const name = size.name;
      const desc =
        `Limits: ${size.resources.limits?.cpu || '??'} CPU, ` +
        `${size.resources.limits?.memory || '??'} Memory | ` +
        `Requests: ${size.resources.requests?.cpu || '??'} CPU, ` +
        `${size.resources.requests?.memory || '??'} Memory`;
      return <SelectOption key={name} value={name} description={desc} />;
    });

  return (
    <FormGroup
      label="Container Size"
      fieldId="modal-notebook-container-size"
      helperText={
        value.notUserDefined ? (
          <HelperText>
            <HelperTextItem variant="warning" hasIcon>
              Your last selected size was no longer available, we have set the size to the default
              one.
            </HelperTextItem>
          </HelperText>
        ) : undefined
      }
    >
      <Select
        removeFindDomNode
        width="70%"
        isOpen={sizeDropdownOpen}
        onToggle={() => setSizeDropdownOpen(!sizeDropdownOpen)}
        aria-labelledby="container-size"
        aria-label="Select a container size"
        selections={value.name}
        onSelect={(event, selection) => {
          // We know we are setting values as a string
          if (typeof selection === 'string') {
            setValue(selection);
            setSizeDropdownOpen(false);
          }
        }}
        menuAppendTo="parent"
      >
        {sizeOptions()}
      </Select>
    </FormGroup>
  );
};

export default SizeSelectField;
