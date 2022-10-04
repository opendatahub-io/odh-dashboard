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
import { getDashboardMainContainer } from '../../../../../utilities/utils';

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
  const [sizeDropdownOpen, setSizeDropdownOpen] = React.useState<boolean>(false);

  const sizeOptions = () =>
    sizes.map((size) => {
      const name = size.name;
      const desc = getSizeDescription(size);
      return <SelectOption key={name} value={name} description={desc} />;
    });

  return (
    <FormGroup
      label="Container Size"
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
        menuAppendTo={getDashboardMainContainer}
      >
        {sizeOptions()}
      </Select>
    </FormGroup>
  );
};

export default ContainerSizeSelector;
