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
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { getDataConnectionDisplayName } from '~/pages/projects/screens/detail/data-connections/utils';
import { DataConnection } from '~/pages/projects/types';
import { getDashboardMainContainer } from '~/utilities/utils';

type ExistingDataConnectionFieldProps = {
  fieldId: string;
  selectedDataConnection?: string;
  setDataConnection: (name?: string) => void;
};

const ExistingDataConnectionField: React.FC<ExistingDataConnectionFieldProps> = ({
  fieldId,
  selectedDataConnection,
  setDataConnection,
}) => {
  const [isOpen, setOpen] = React.useState(false);
  const {
    dataConnections: { data: connections, loaded, error },
  } = React.useContext(ProjectDetailsContext);
  const [filterValue, setFilterValue] = React.useState<string>('');
  const [inputValue, setInputValue] = React.useState<string>('');

  const [selectedOptions, setSelectedOptions] = React.useState<SelectOptionProps[]>([]);

  const textInputRef = React.useRef<HTMLInputElement>();

  React.useEffect(() => {
    if (selectedDataConnection) {
      const existingDataConnection = connections.find(
        (connection) => connection.data.metadata.name === selectedDataConnection,
      );
      if (existingDataConnection) {
        setInputValue(getDataConnectionDisplayName(existingDataConnection));
        setFilterValue('');
      }
    }
  }, [connections, selectedDataConnection]);

  React.useEffect(() => {
    const uniqueConnections = new Set<DataConnection>();
    connections.forEach((connection) => {
      uniqueConnections.add(connection);
    });

    let newOptions = Array.from(uniqueConnections).map((connection) => ({
      value: connection.data.metadata.name,
      children: getDataConnectionDisplayName(connection),
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
  }, [connections, filterValue, isOpen]);

  if (error) {
    return (
      <Alert title="Error loading data connections" variant="danger">
        {error.message}
      </Alert>
    );
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
                setDataConnection('');
                setInputValue('');
                setFilterValue('');
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

  const empty = connections.length === 0;
  let placeholderText: string;
  if (!loaded) {
    placeholderText = 'Loading data connections...';
  } else if (empty) {
    placeholderText = 'No existing data connections available';
  } else {
    placeholderText = 'Select a data connection';
  }

  return (
    <FormGroup
      isRequired
      label="Data connection"
      fieldId={fieldId}
      data-testid="data-connection-group"
    >
      <Select
        selected={selectedDataConnection}
        onOpenChange={(open) => setOpen(open)}
        isOpen={isOpen}
        onSelect={(e, selection) => {
          if (typeof selection === 'string' && selection !== 'no results') {
            setDataConnection(selection);
            setFilterValue('');
          }
          setOpen(!isOpen);
        }}
        toggle={toggle}
        popperProps={{ direction: 'up', appendTo: getDashboardMainContainer() }}
      >
        <SelectList isAriaMultiselectable id="select-multi-create-typeahead-listbox">
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

export default ExistingDataConnectionField;
