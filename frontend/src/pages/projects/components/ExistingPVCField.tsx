import * as React from 'react';
import {
  Alert,
  Button,
  FormGroup,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
  SelectOptionProps,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { PersistentVolumeClaimKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';

type ExistingPVCFieldProps = {
  fieldId: string;
  storages: PersistentVolumeClaimKind[];
  loaded: boolean;
  loadError?: Error;
  selectedStorage?: string;
  setStorage: (storage?: string) => void;
  selectDirection?: 'up' | 'down';
  menuAppendTo?: HTMLElement;
};

const ExistingPVCField: React.FC<ExistingPVCFieldProps> = ({
  fieldId,
  storages,
  loaded,
  loadError,
  selectedStorage,
  setStorage,
  selectDirection = 'down',
  menuAppendTo,
}) => {
  const [isOpen, setOpen] = React.useState(false);
  const [filterValue, setFilterValue] = React.useState<string>('');
  const [inputValue, setInputValue] = React.useState<string>('');
  const [selectedOptions, setSelectedOptions] = React.useState<SelectOptionProps[]>([]);

  const textInputRef = React.useRef<HTMLInputElement>();
  const currentStorage = storages.find((pvc) => pvc.metadata.name === selectedStorage);
  React.useEffect(() => {
    if (loaded && !loadError && selectedStorage) {
      setInputValue(selectedStorage);
      setFilterValue(selectedStorage);
    }
  }, [loadError, loaded, selectedStorage]);

  React.useEffect(() => {
    const uniqueIdentifiers = new Set<PersistentVolumeClaimKind>();
    storages.forEach((pvc) => {
      uniqueIdentifiers.add(pvc);
    });

    let newOptions = Array.from(uniqueIdentifiers).map((pvc) => ({
      value: pvc.metadata.name,
      children: getDisplayNameFromK8sResource(pvc),
    }));

    if (filterValue) {
      newOptions = newOptions.filter((menuItem) =>
        String(menuItem.children).toLowerCase().includes(filterValue.toLowerCase()),
      );

      // When no options are found after filtering, display 'No results found'
      if (!newOptions.length) {
        newOptions = [
          {
            children: `No results found for "${filterValue}"`,
            value: 'no results',
          },
        ];
      }

      // Open the menu when the input value changes and the new value is not empty
      if (!isOpen) {
        setOpen(true);
      }
    }
    setSelectedOptions(newOptions);
  }, [filterValue, isOpen, storages, loaded]);

  if (loadError) {
    return (
      <Alert title="Error loading pvcs" variant="danger">
        {loadError.message}
      </Alert>
    );
  }

  const empty = storages.length === 0;
  let placeholderText: string;

  if (currentStorage) {
    placeholderText = getDisplayNameFromK8sResource(currentStorage);
  } else if (!loaded) {
    placeholderText = 'Loading storages...';
  } else if (empty) {
    placeholderText = 'No existing storages available';
  } else {
    placeholderText = 'Select a persistent storage';
  }

  const onToggleClick = () => {
    setOpen(!isOpen);
  };

  const onTextInputChange = (_event: React.FormEvent<HTMLInputElement>, value: string) => {
    setInputValue(value);
    setFilterValue(value);
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      variant="typeahead"
      aria-label="Options menu"
      onClick={onToggleClick}
      isDisabled={empty}
      isExpanded={isOpen}
      isFullWidth
    >
      <TextInputGroup isPlain>
        <TextInputGroupMain
          value={inputValue}
          onClick={onToggleClick}
          onChange={onTextInputChange}
          id="typeahead-select-input"
          autoComplete="off"
          innerRef={textInputRef}
          placeholder={placeholderText}
          role="combobox"
          isExpanded={isOpen}
          aria-controls="select-typeahead-listbox"
        />

        <TextInputGroupUtilities>
          {!!inputValue && (
            <Button
              variant="plain"
              onClick={() => {
                setInputValue('');
                setFilterValue('');
                setStorage('');
                textInputRef.current?.focus();
              }}
              aria-label="Clear input value"
            >
              <TimesIcon aria-hidden />
            </Button>
          )}
        </TextInputGroupUtilities>
      </TextInputGroup>
    </MenuToggle>
  );

  return (
    <FormGroup
      isRequired
      label="Persistent storage"
      fieldId={fieldId}
      data-testid="persistent-storage-group"
    >
      <Select
        selected={selectedStorage}
        onOpenChange={(open) => setOpen(open)}
        popperProps={{ direction: selectDirection, appendTo: menuAppendTo }}
        isOpen={isOpen}
        onSelect={(e, selection) => {
          if (typeof selection === 'string' && selection !== 'no results') {
            setStorage(selection);
            setOpen(false);
            setFilterValue('');
          }
          textInputRef.current?.focus();
        }}
        toggle={toggle}
      >
        <SelectList isAriaMultiselectable id="select-typeahead-listbox">
          {selectedOptions.map((option) => (
            <SelectOption key={option.value} {...option} ref={null}>
              {option.children}
            </SelectOption>
          ))}
        </SelectList>
      </Select>
    </FormGroup>
  );
};

export default ExistingPVCField;
