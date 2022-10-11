import * as React from 'react';
import { FormGroup, Select } from '@patternfly/react-core';
import { getDashboardMainContainer } from '../../../utilities/utils';

type ExistingStorageProjectFieldProps = {
  fieldId: string;
  project?: string;
  isOpen: boolean;
  setProject: (project?: string) => void;
  setStorage: (storage?: string) => void;
  setOpen: (open: boolean) => void;
  selectDirection?: 'up' | 'down';
  options: React.ReactElement[];
};

const ExistingStorageProjectField: React.FC<ExistingStorageProjectFieldProps> = ({
  fieldId,
  project,
  isOpen,
  setProject,
  setStorage,
  setOpen,
  selectDirection = 'down',
  options,
}) => {
  return (
    <FormGroup label="Project" fieldId={fieldId}>
      <Select
        variant="typeahead"
        selections={project}
        isOpen={isOpen}
        onClear={() => {
          setProject(undefined);
          setStorage(undefined);
          setOpen(false);
        }}
        onSelect={(e, selection) => {
          if (typeof selection === 'string') {
            setProject(selection);
            setStorage(undefined);
            setOpen(false);
          }
        }}
        onToggle={setOpen}
        placeholderText="Select the project connected to the PV"
        direction={selectDirection}
        menuAppendTo={selectDirection === 'up' ? getDashboardMainContainer() : 'parent'}
      >
        {options}
      </Select>
    </FormGroup>
  );
};

export default ExistingStorageProjectField;
