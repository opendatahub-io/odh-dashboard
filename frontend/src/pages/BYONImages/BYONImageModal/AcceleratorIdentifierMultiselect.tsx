import React, { useEffect, useState } from 'react';
import {
  Label,
  LabelGroup,
  Button,
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
import useAcceleratorProfiles from '~/pages/notebookController/screens/server/useAcceleratorProfiles';
import { useDashboardNamespace } from '~/redux/selectors';

type AcceleratorIdentifierMultiselectProps = {
  data: string[];
  setData: (data: string[]) => void;
};

export const AcceleratorIdentifierMultiselect: React.FC<AcceleratorIdentifierMultiselectProps> = ({
  data,
  setData,
}) => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [acceleratorProfiles, loaded, loadError] = useAcceleratorProfiles(dashboardNamespace);

  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState<string>('');
  const [selectOptions, setSelectOptions] = useState<SelectOptionProps[]>([]);
  const [onCreation, setOnCreation] = React.useState(false); // Boolean to refresh filter state after new option is created

  const textInputRef = React.useRef<HTMLInputElement>();

  useEffect(() => {
    if (loaded && !loadError) {
      const uniqueIdentifiers = new Set<string>();

      // Add identifiers from accelerators
      acceleratorProfiles.forEach((cr) => {
        uniqueIdentifiers.add(cr.spec.identifier);
      });

      // Add identifiers from initial data
      data.forEach((identifier) => {
        uniqueIdentifiers.add(identifier);
      });

      // Convert unique identifiers to SelectOptionProps
      let newOptions = Array.from(uniqueIdentifiers).map((identifier) => ({
        value: identifier,
        children: identifier,
      }));

      // Filter menu items based on the text input value when one exists
      if (inputValue) {
        newOptions = newOptions.filter((menuItem) =>
          String(menuItem.children).toLowerCase().includes(inputValue.toLowerCase()),
        );

        // When no options are found after filtering, display creation option
        if (!newOptions.length) {
          newOptions = [{ children: `Create new option "${inputValue}"`, value: 'create' }];
        }

        // Open the menu when the input value changes and the new value is not empty
        if (!isOpen) {
          setIsOpen(true);
        }
      }

      setSelectOptions(newOptions);
    }
  }, [acceleratorProfiles, loaded, loadError, data, onCreation, inputValue, isOpen]);

  const onToggleClick = () => {
    setIsOpen(!isOpen);
  };

  const onTextInputChange = (_event: React.FormEvent<HTMLInputElement>, value: string) => {
    setInputValue(value);
  };

  const onSelect = (value: string) => {
    if (value) {
      if (value === 'create') {
        // Check if the input value already exists in selectOptions
        if (!selectOptions.some((option) => option.value === inputValue)) {
          // Add the new option to selectOptions
          setSelectOptions([...selectOptions, { value: inputValue, children: inputValue }]);
        }
        // Update the selected values
        setData(
          data.includes(inputValue)
            ? data.filter((selection) => selection !== inputValue)
            : [...data, inputValue],
        );
        setOnCreation(!onCreation);
        setInputValue('');
      } else {
        // Handle selecting an existing option
        setData(
          data.includes(value) ? data.filter((selection) => selection !== value) : [...data, value],
        );
      }
    }
    textInputRef.current?.focus();
  };

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      variant="typeahead"
      onClick={onToggleClick}
      innerRef={toggleRef}
      isExpanded={isOpen}
      isFullWidth
    >
      <TextInputGroup isPlain>
        <TextInputGroupMain
          value={inputValue}
          onClick={onToggleClick}
          onChange={onTextInputChange}
          id="multi-create-typeahead-select-input"
          autoComplete="off"
          innerRef={textInputRef}
          placeholder="Example, nvidia.com/gpu"
          role="combobox"
          isExpanded={isOpen}
          aria-controls="select-multi-create-typeahead-listbox"
        >
          <LabelGroup aria-label="Current selections">
            {data.map((selection, index) => (
              <Label
                variant="outline"
                key={index}
                onClose={(ev) => {
                  ev.stopPropagation();
                  onSelect(selection);
                }}
              >
                {selection}
              </Label>
            ))}
          </LabelGroup>
        </TextInputGroupMain>
        <TextInputGroupUtilities>
          {data.length > 0 && (
            <Button
              icon={<TimesIcon aria-hidden />}
              variant="plain"
              onClick={() => {
                setInputValue('');
                setData([]);
                textInputRef.current?.focus();
              }}
              aria-label="Clear input value"
            />
          )}
        </TextInputGroupUtilities>
      </TextInputGroup>
    </MenuToggle>
  );

  return (
    <Select
      id="multi-create-typeahead-select"
      isOpen={isOpen}
      selected={data}
      onSelect={(ev, selection) => {
        if (typeof selection === 'string') {
          onSelect(selection);
        }
      }}
      onOpenChange={() => setIsOpen(false)}
      toggle={toggle}
    >
      <SelectList isAriaMultiselectable id="select-multi-create-typeahead-listbox">
        {selectOptions.map((option) => (
          <SelectOption key={option.value} {...option} ref={null} />
        ))}
      </SelectList>
    </Select>
  );
};
