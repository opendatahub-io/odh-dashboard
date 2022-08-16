import * as React from 'react';
import { FormGroup, Select, SelectOption } from '@patternfly/react-core';
import AppContext from 'app/AppContext';

type SizeSelectFieldProps = {
  value: string;
  setValue: (newValue: string) => void;
};

const SizeSelectField: React.FC<SizeSelectFieldProps> = ({ value, setValue }) => {
  const [sizeDropdownOpen, setSizeDropdownOpen] = React.useState<boolean>(false);
  const { dashboardConfig } = React.useContext(AppContext);
  console.log(value);

  const sizeOptions = React.useMemo(() => {
    const sizes = dashboardConfig?.spec?.notebookSizes;
    if (!sizes?.length) {
      return [<SelectOption key="Default" value="Default" description="No Size Limits" />];
    }

    return sizes.map((size) => {
      const name = size.name;
      const desc =
        name === 'Default'
          ? 'Resources set based on administrator configurations'
          : `Limits: ${size?.resources?.limits?.cpu || '??'} CPU, ` +
            `${size?.resources?.limits?.memory || '??'} Memory ` +
            `Requests: ${size?.resources?.requests?.cpu || '??'} CPU, ` +
            `${size?.resources?.requests?.memory || '??'} Memory`;
      return <SelectOption key={name} value={name} description={desc} />;
    });
  }, [dashboardConfig]);

  const handleSizeSelection = (e, selection) => {
    setValue(selection);
    setSizeDropdownOpen(false);
  };

  return (
    <FormGroup label="Container Size" fieldId="modal-notebook-container-size">
      <Select
        isOpen={sizeDropdownOpen}
        onToggle={() => setSizeDropdownOpen(!sizeDropdownOpen)}
        aria-labelledby="container-size"
        selections={value}
        onSelect={handleSizeSelection}
        menuAppendTo="parent"
      >
        {sizeOptions}
      </Select>
    </FormGroup>
  );
};

export default SizeSelectField;
