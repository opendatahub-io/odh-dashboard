import * as React from 'react';
import { Alert, FormGroup, Select, SelectOption, Skeleton } from '@patternfly/react-core';
import { getPvcDisplayName } from '../utils';
import { PersistentVolumeClaimKind } from '../../../k8sTypes';

type ExistingPVCFieldProps = {
  fieldId: string;
  storages: PersistentVolumeClaimKind[];
  loaded: boolean;
  loadError?: Error;
  selectedStorage?: string;
  setStorage: (storage?: string) => void;
  selectDirection?: 'up' | 'down';
  menuAppendTo?: HTMLElement | 'parent';
};

const ExistingPVCField: React.FC<ExistingPVCFieldProps> = ({
  fieldId,
  storages,
  loaded,
  loadError,
  selectedStorage,
  setStorage,
  selectDirection = 'down',
  menuAppendTo = 'parent',
}) => {
  const [isOpen, setOpen] = React.useState<boolean>(false);

  if (!loaded) {
    return <Skeleton />;
  }

  if (loadError) {
    return (
      <Alert title="Error loading pvcs" variant="danger">
        {loadError.message}
      </Alert>
    );
  }

  const options = storages.map((pvc) => (
    <SelectOption key={pvc.metadata.name} value={pvc.metadata.name}>
      {getPvcDisplayName(pvc)}
    </SelectOption>
  ));

  const empty = options.length === 0;

  return (
    <FormGroup label="PV" fieldId={fieldId}>
      <Select
        variant="typeahead"
        selections={selectedStorage}
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
        menuAppendTo={menuAppendTo}
      >
        {options}
      </Select>
    </FormGroup>
  );
};

export default ExistingPVCField;
