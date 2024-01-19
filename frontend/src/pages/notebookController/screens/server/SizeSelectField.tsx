import * as React from 'react';
import { FormGroup, FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import { Select, SelectOption } from '@patternfly/react-core/deprecated';
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
      const { name } = size;
      const desc =
        `Limits: ${size.resources.limits?.cpu || '??'} CPU, ` +
        `${size.resources.limits?.memory || '??'} Memory | ` +
        `Requests: ${size.resources.requests?.cpu || '??'} CPU, ` +
        `${size.resources.requests?.memory || '??'} Memory`;
      return <SelectOption key={name} value={name} description={desc} />;
    });

  return (
    <FormGroup label="Container Size" fieldId="modal-notebook-container-size">
      <Select
        width="70%"
        isOpen={sizeDropdownOpen}
        onToggle={() => setSizeDropdownOpen(!sizeDropdownOpen)}
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
      {value.notUserDefined ? (
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant="warning" hasIcon>
              Your last selected size was no longer available, we have set the size to the default
              one.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      ) : undefined}
    </FormGroup>
  );
};

export default SizeSelectField;
