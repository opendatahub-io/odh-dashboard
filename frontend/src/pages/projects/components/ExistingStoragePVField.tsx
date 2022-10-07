import * as React from 'react';
import { FormGroup, Select, Skeleton } from '@patternfly/react-core';
import { getDashboardMainContainer } from '../../../utilities/utils';

type ExistingStoragePVFieldProps = {
  fieldId: string;
  storage?: string;
  isOpen: boolean;
  setStorage: (storage?: string) => void;
  setOpen: (open: boolean) => void;
  selectDirection?: 'up' | 'down';
  options: React.ReactElement[];
  storageLoading: boolean;
};

const ExistingStoragePVField: React.FC<ExistingStoragePVFieldProps> = ({
  fieldId,
  storage,
  isOpen,
  setStorage,
  setOpen,
  selectDirection = 'down',
  options,
  storageLoading,
}) => {
  if (storageLoading) {
    return <Skeleton />;
  }
  const empty = options.length === 0;
  return (
    <FormGroup label="PV" fieldId={fieldId}>
      <Select
        variant="typeahead"
        selections={storage}
        isOpen={isOpen}
        onClear={() => {
          setStorage(undefined);
          setOpen(false);
        }}
        isDisabled={empty}
        onSelect={(e, selection) => {
          if (typeof selection === 'string') {
            setStorage(selection);
            setOpen(false);
          }
        }}
        onToggle={setOpen}
        placeholderText={empty ? 'No storage available' : 'Select the PV to add to your project'}
        direction={selectDirection}
        menuAppendTo={selectDirection === 'up' ? getDashboardMainContainer() : 'parent'}
      >
        {options}
      </Select>
    </FormGroup>
  );
};

export default ExistingStoragePVField;
