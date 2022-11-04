import * as React from 'react';
import { Alert, FormGroup, Select, SelectOption } from '@patternfly/react-core';
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

  if (loadError) {
    return (
      <Alert title="Error loading pvcs" variant="danger">
        {loadError.message}
      </Alert>
    );
  }

  const empty = storages.length === 0;
  let placeholderText: string;
  if (!loaded) {
    placeholderText = 'Loading storages...';
  } else if (empty) {
    placeholderText = 'No existing storages available';
  } else {
    placeholderText = 'Select a persistent storage';
  }

  return (
    <FormGroup isRequired label="Persistent storage" fieldId={fieldId}>
      <Select
        removeFindDomNode
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
        placeholderText={placeholderText}
        direction={selectDirection}
        menuAppendTo={menuAppendTo}
      >
        {storages.map((pvc) => (
          <SelectOption key={pvc.metadata.name} value={pvc.metadata.name}>
            {getPvcDisplayName(pvc)}
          </SelectOption>
        ))}
      </Select>
    </FormGroup>
  );
};

export default ExistingPVCField;
