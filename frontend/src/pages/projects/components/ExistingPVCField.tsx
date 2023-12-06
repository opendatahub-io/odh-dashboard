import * as React from 'react';
import { Alert, FormGroup } from '@patternfly/react-core';
import { Select, SelectOption } from '@patternfly/react-core/deprecated';
import { getPvcDisplayName } from '~/pages/projects/utils';
import { PersistentVolumeClaimKind } from '~/k8sTypes';

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
  const [isOpen, setOpen] = React.useState(false);

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
        variant="typeahead"
        aria-label="Persistent storage select"
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
        onToggle={(e, isExpanded) => setOpen(isExpanded)}
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
