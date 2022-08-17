import * as React from 'react';
import { FormGroup, Select, SelectOption } from '@patternfly/react-core';
import AppContext from '../../../../app/AppContext';
import { usePreferredNotebookSize } from './usePreferredNotebookSize';

const SizeSelectField: React.FC = () => {
  const { selectedSize, setSelectedSize } = usePreferredNotebookSize();
  const [sizeDropdownOpen, setSizeDropdownOpen] = React.useState<boolean>(false);
  const { dashboardConfig } = React.useContext(AppContext);

  const sizeOptions = () => {
    const sizes = dashboardConfig?.spec?.notebookSizes;
    if (!sizes?.length) {
      return [<SelectOption key="Default" value="Default" description="No Size Limits" />];
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
    <FormGroup label="Container Size" fieldId="modal-notebook-container-size">
      <Select
        isOpen={sizeDropdownOpen}
        onToggle={() => setSizeDropdownOpen(!sizeDropdownOpen)}
        aria-labelledby="container-size"
        selections={selectedSize}
        onSelect={(event, selection) => {
          // We know we are setting values as a string
          if (typeof selection === 'string') {
            setSelectedSize(selection);
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
