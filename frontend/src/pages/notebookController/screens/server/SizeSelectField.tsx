import * as React from 'react';
import { FormGroup, Select, SelectOption } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import AppContext from '../../../../app/AppContext';

type SizeSelectFieldProps = {
  value: string;
  setValue: (newValue: string) => void;
};

const SizeSelectField: React.FC<SizeSelectFieldProps> = ({ value, setValue }) => {
  const [sizeDropdownOpen, setSizeDropdownOpen] = React.useState<boolean>(false);
  const { dashboardConfig } = React.useContext(AppContext);
  const sizes = dashboardConfig?.spec?.notebookSizes || [];

  const sizeOptions = () => {
    if (sizes.length === 0) {
      return [<SelectOption key="Default" value="No sizes" />];
    }

    return sizes.map((size) => {
      const name = size.name;
      const desc =
        `Limits: ${size?.resources?.limits?.cpu || '??'} CPU, ` +
        `${size?.resources?.limits?.memory || '??'} Memory ` +
        `Requests: ${size?.resources?.requests?.cpu || '??'} CPU, ` +
        `${size?.resources?.requests?.memory || '??'} Memory`;
      return <SelectOption key={name} value={name} description={desc} />;
    });
  };

  return (
    <FormGroup
      label="Container Size"
      fieldId="modal-notebook-container-size"
      helperTextInvalid="No notebook sizes configured"
      helperTextInvalidIcon={<ExclamationCircleIcon />}
      validated={sizes.length === 0 ? 'error' : undefined}
    >
      <Select
        isOpen={sizeDropdownOpen}
        onToggle={() => setSizeDropdownOpen(!sizeDropdownOpen)}
        aria-labelledby="container-size"
        selections={value}
        onSelect={(event, selection) => {
          // We know we are setting values as a string
          if (typeof selection === 'string') {
            setValue(selection);
            setSizeDropdownOpen(false);
          }
        }}
        isDisabled={sizes.length === 0}
        menuAppendTo="parent"
      >
        {sizeOptions()}
      </Select>
    </FormGroup>
  );
};

export default SizeSelectField;
