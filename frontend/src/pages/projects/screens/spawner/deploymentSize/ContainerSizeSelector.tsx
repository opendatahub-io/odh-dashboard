import * as React from 'react';
import { FormGroup, FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import { Select, SelectOption } from '@patternfly/react-core/deprecated';
import { NotebookSize } from '~/types';
import { getSizeDescription } from '~/pages/projects/screens/spawner/spawnerUtils';

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
    <FormGroup label="Container size" fieldId="container-size">
      <Select
        data-id="container-size-select"
        isOpen={sizeDropdownOpen}
        onToggle={() => setSizeDropdownOpen(!sizeDropdownOpen)}
        aria-label="Container size select"
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

export default ContainerSizeSelector;
