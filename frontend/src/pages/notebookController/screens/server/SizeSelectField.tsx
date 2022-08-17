import * as React from 'react';
import { FormGroup, Select, SelectOption } from '@patternfly/react-core';
import AppContext from '../../../../app/AppContext';
import { NotebookControllerContext } from '../../NotebookControllerContext';

type SizeSelectFieldProps = {
  value: string;
  setValue: (newValue: string) => void;
};

const SizeSelectField: React.FC<SizeSelectFieldProps> = ({ value, setValue }) => {
  const [sizeDropdownOpen, setSizeDropdownOpen] = React.useState<boolean>(false);
  const { dashboardConfig } = React.useContext(AppContext);
  const { currentUserState } = React.useContext(NotebookControllerContext);

  React.useEffect(() => {
    if (dashboardConfig?.spec.notebookSizes) {
      if (currentUserState?.lastSelectedSize) {
        const size = dashboardConfig.spec.notebookSizes.find(
          (notebookSize) => notebookSize.name === currentUserState.lastSelectedSize,
        );
        if (size) {
          setValue(size.name);
        } else {
          setValue(dashboardConfig.spec.notebookSizes[0].name);
        }
      } else {
        setValue(dashboardConfig.spec.notebookSizes[0].name);
      }
    }
  }, [dashboardConfig, currentUserState, setValue]);

  const sizeOptions = React.useMemo(() => {
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
