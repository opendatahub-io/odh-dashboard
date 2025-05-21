import * as React from 'react';
import { FormGroup, FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import { NotebookSize } from '~/types';
import { getDashboardMainContainer } from '~/utilities/utils';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
import { formatMemory } from '~/utilities/valueUnits';

type SizeSelectFieldProps = {
  value: NotebookSize;
  setValue: (newValue: string) => void;
  sizes: NotebookSize[];
};

const SizeSelectField: React.FC<SizeSelectFieldProps> = ({ value, setValue, sizes }) => {
  const sizeOptions = () =>
    sizes.map((size): SimpleSelectOption => {
      const { name } = size;
      const desc =
        `Limits: ${size.resources.limits?.cpu || '??'} CPU, ` +
        `${formatMemory(size.resources.limits?.memory) || '??'} Memory | ` +
        `Requests: ${size.resources.requests?.cpu || '??'} CPU, ` +
        `${formatMemory(size.resources.requests?.memory) || '??'} Memory`;

      return {
        key: name,
        label: name,
        description: desc,
      };
    });

  return (
    <FormGroup label="Container Size" fieldId="modal-notebook-container-size">
      <SimpleSelect
        popperProps={{ appendTo: getDashboardMainContainer() }}
        options={sizeOptions()}
        toggleProps={{ style: { width: '70%' } }}
        value={value.name}
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
};

export default SizeSelectField;
