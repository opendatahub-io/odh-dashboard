import * as React from 'react';
import {
  FormGroup,
  HelperText,
  HelperTextItem,
  Select,
  SelectOption,
} from '@patternfly/react-core';
import { NotebookSize } from '../../../../../types';
import { getSizeDescription } from '../spawnerUtils';

type ContainerSizeSelectorProps = {
  value: NotebookSize;
  setValue: (newValue: string) => void;
  sizes: NotebookSize[];
};

const ContainerSizeSelector: React.FC<ContainerSizeSelectorProps> = ({
  value,
  setValue,
  sizes,
}) => {
  const [sizeDropdownOpen, setSizeDropdownOpen] = React.useState(false);

  return (
    <FormGroup
      label="Container size"
      fieldId="container-size"
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
        data-id="container-size-select"
        isOpen={sizeDropdownOpen}
        onToggle={() => setSizeDropdownOpen(!sizeDropdownOpen)}
        aria-labelledby="container-size"
        selections={value.name}
        onSelect={(event, selection) => {
          // We know we are setting values as a string
          if (typeof selection === 'string') {
            setValue(selection);
            setSizeDropdownOpen(false);
          }
        }}
      >
        {sizes.map((size) => {
          const name = size.name;
          const desc = getSizeDescription(size);
          return <SelectOption key={name} value={name} description={desc} />;
        })}
      </Select>
    </FormGroup>
  );
};

export default ContainerSizeSelector;
