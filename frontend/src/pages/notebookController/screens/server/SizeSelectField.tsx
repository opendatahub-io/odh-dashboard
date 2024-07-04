import * as React from 'react';
import { FormGroup, FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import { NotebookSize } from '~/types';
import { getDashboardMainContainer } from '~/utilities/utils';
import SimpleSelect from '~/components/SimpleSelect';

type SizeSelectFieldProps = {
  value: NotebookSize;
  setValue: (newValue: string) => void;
  sizes: NotebookSize[];
};

const SizeSelectField: React.FC<SizeSelectFieldProps> = ({ value, setValue, sizes }) => {
  const sizeOptions = () =>
    sizes.map((size) => {
      const { name } = size;
      const desc =
        `Limits: ${size.resources.limits?.cpu || '??'} CPU, ` +
        `${size.resources.limits?.memory || '??'} Memory | ` +
        `Requests: ${size.resources.requests?.cpu || '??'} CPU, ` +
        `${size.resources.requests?.memory || '??'} Memory`;

      return {
        key: name,
        children: name,
        description: desc,
      };
    });

  return (
    <FormGroup label="Container Size" fieldId="modal-notebook-container-size">
      <SimpleSelect
        popperProps={{ appendTo: getDashboardMainContainer() }}
        options={sizeOptions()}
        style={{ width: '70%' }}
        toggleLabel={value.name}
        selected={value.name}
        onSelect={(event, selection) => {
          // We know we are setting values as a string
          if (typeof selection === 'string') {
            setValue(selection);
          }
        }}
      />

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
