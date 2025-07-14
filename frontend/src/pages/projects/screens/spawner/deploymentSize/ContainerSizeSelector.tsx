import * as React from 'react';
import { FormGroup, FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import { NotebookSize } from '#~/types';
import { getSizeDescription } from '#~/pages/projects/screens/spawner/spawnerUtils';
import { getDashboardMainContainer } from '#~/utilities/utils';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';

type ContainerSizeSelectorProps = {
  value: NotebookSize;
  setValue: (newValue: string) => void;
  sizes: NotebookSize[];
};

const ContainerSizeSelector: React.FC<ContainerSizeSelectorProps> = ({
  value,
  setValue,
  sizes,
}) => (
  <FormGroup label="Container size" fieldId="container-size" data-testid="container-size-group">
    <SimpleSelect
      popperProps={{ appendTo: getDashboardMainContainer() }}
      isFullWidth
      value={value.name}
      options={sizes.map((size): SimpleSelectOption => {
        const { name } = size;
        const desc = getSizeDescription(size);
        return { key: name, label: name, description: desc };
      })}
      onChange={setValue}
    />

    {value.notUserDefined ? (
      <FormHelperText>
        <HelperText>
          <HelperTextItem variant="warning">
            Your last selected size was no longer available, we have set the size to the default
            one.
          </HelperTextItem>
        </HelperText>
      </FormHelperText>
    ) : undefined}
  </FormGroup>
);

export default ContainerSizeSelector;
