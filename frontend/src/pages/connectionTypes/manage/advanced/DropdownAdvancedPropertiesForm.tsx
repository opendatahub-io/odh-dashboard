import * as React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Radio,
  TextInput,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import useDraggableTableControlled from '#~/utilities/useDraggableTableControlled';
import { DropdownField } from '#~/concepts/connectionTypes/types';
import { AdvancedFieldProps } from '#~/pages/connectionTypes/manage/advanced/types';
import ExpandableFormSection from '#~/components/ExpandableFormSection';

const DropdownAdvancedPropertiesForm: React.FC<AdvancedFieldProps<DropdownField>> = ({
  properties,
  onChange,
  onValidate,
}) => {
  const { variant } = properties;
  React.useEffect(() => {
    if (!variant) {
      onChange({ ...properties, variant: 'single' });
    }
    // only run when variant is not set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  React.useEffect(() => {
    // filter out empty rows for validation (they will be removed on save)
    const itemsWithoutEmptyRows =
      properties.items?.filter((item) => item.label || item.value) ?? [];
    const duplicateLabels = itemsWithoutEmptyRows.some(
      (item1, index1) =>
        item1.label &&
        itemsWithoutEmptyRows.some(
          (item2, index2) => item1.label === item2.label && index1 !== index2,
        ),
    );
    const duplicateValues = itemsWithoutEmptyRows.some((item1, index1) =>
      itemsWithoutEmptyRows.some(
        (item2, index2) => item1.value === item2.value && index1 !== index2,
      ),
    );
    const noMissingValues = itemsWithoutEmptyRows.every((item) => item.value);

    onValidate(
      !!properties.variant &&
        itemsWithoutEmptyRows.length > 0 &&
        noMissingValues &&
        !duplicateLabels &&
        !duplicateValues,
    );
  }, [properties.variant, properties.items, onValidate]);

  const dropdownItems = React.useMemo(
    () => properties.items || [{ label: '', value: '' }],
    [properties],
  );
  const setDropdownItems = React.useCallback(
    (items: { label: string; value: string; labelError?: string; valueError?: string }[]) => {
      // if a default value no longer exists as a possible option, remove it
      const newDefaults = properties.defaultValue?.filter((defaultOption) =>
        items.find((newOption) => defaultOption === newOption.value),
      );
      const newItems = items.map((item, index) => {
        const duplicateLabel = items.find(
          (dup, dupIndex) => item.label && item.label === dup.label && dupIndex < index,
        );
        const duplicateValue = items.find(
          (dup, dupIndex) => item.value && item.value === dup.value && dupIndex < index,
        );
        return {
          label: item.label,
          value: item.value,
          ...(duplicateLabel && { labelError: `${item.label} already exists.` }),
          ...(duplicateValue && { valueError: `${item.value} already exists.` }),
        };
      });
      onChange({
        ...properties,
        defaultValue: newDefaults,
        items: newItems,
      });
    },
    [properties, onChange],
  );

  const { tableProps, rowsToRender } = useDraggableTableControlled<{
    label: string;
    value: string;
    labelError?: string;
    valueError?: string;
  }>(dropdownItems, setDropdownItems);

  return (
    <ExpandableFormSection
      toggleText="Advanced settings"
      data-testid="advanced-settings-toggle"
      initExpanded
    >
      <FormGroup
        label="Dropdown variation"
        fieldId="dropdown-variation-radio-group"
        role="radiogroup"
        isRequired
      >
        <Flex>
          <FlexItem>
            <Radio
              id="radio-single-select"
              data-testid="radio-single-select"
              name="dropdown-variation-radio"
              label="Single-select"
              isChecked={properties.variant === 'single'}
              onChange={() =>
                onChange({
                  ...properties,
                  variant: 'single',
                  // if there were multiple defaults from a multi select, clear all but one
                  defaultValue: properties.defaultValue?.length ? [properties.defaultValue[0]] : [],
                })
              }
            />
          </FlexItem>
          <FlexItem>
            <Radio
              id="radio-multi-select"
              data-testid="radio-multi-select"
              name="dropdown-variation-radio"
              label="Multi-select"
              isChecked={properties.variant === 'multi'}
              onChange={() => onChange({ ...properties, variant: 'multi' })}
            />
          </FlexItem>
        </Flex>
      </FormGroup>
      <FormGroup>
        <Table data-testid="connection-type-fields-table" className={tableProps.className}>
          <Thead noWrap>
            <Tr>
              <Th screenReaderText="Drag and drop" />
              <Th
                info={{
                  popover:
                    'This label is the display name for the dropdown item. If no label is specified, the value is used as the label.',
                  popoverProps: {
                    headerContent: 'Dropdown item label',
                  },
                }}
                width={45}
              >
                Dropdown item labels
              </Th>
              <Th
                info={{
                  popover: 'This value is associated with the dropdown item.',
                  popoverProps: {
                    headerContent: 'Dropdown item value',
                  },
                }}
                width={45}
              >
                <div>
                  Dropdown item values
                  <span aria-hidden="true" className={text.textColorStatusDanger}>
                    {' *'}
                  </span>
                </div>
              </Th>
              <Th screenReaderText="Actions" />
            </Tr>
          </Thead>
          <Tbody {...tableProps.tbodyProps}>
            {rowsToRender.map((r, i) => (
              <Tr key={i} draggable {...r.rowProps} data-testid="dropdown-item-row">
                <Td
                  draggableRow={{
                    id: `draggable-row-${r.rowProps.id}`,
                  }}
                />
                <Td dataLabel="Dropdown item labels">
                  <TextInput
                    data-testid={`dropdown-item-row-label-${i}`}
                    value={r.data.label}
                    type="text"
                    onChange={(_, label) => {
                      setDropdownItems([
                        ...dropdownItems.slice(0, i),
                        {
                          label,
                          value: dropdownItems[i].value,
                        },
                        ...dropdownItems.slice(i + 1),
                      ]);
                    }}
                    validated={r.data.labelError ? 'error' : undefined}
                    aria-label="dropdown item label"
                  />
                  {r.data.labelError && (
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem icon={<ExclamationCircleIcon />} variant="error">
                          {r.data.labelError}
                        </HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  )}
                </Td>
                <Td dataLabel="Dropdown item values">
                  <TextInput
                    data-testid={`dropdown-item-row-value-${i}`}
                    value={r.data.value}
                    type="text"
                    onChange={(_, value) => {
                      setDropdownItems([
                        ...dropdownItems.slice(0, i),
                        {
                          label: dropdownItems[i].label,
                          value,
                        },
                        ...dropdownItems.slice(i + 1),
                      ]);
                    }}
                    validated={r.data.valueError ? 'error' : undefined}
                    aria-label="dropdown item value"
                  />
                  {r.data.valueError && (
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem icon={<ExclamationCircleIcon />} variant="error">
                          {r.data.valueError}
                        </HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  )}
                </Td>
                <Td>
                  <Button
                    icon={<MinusCircleIcon />}
                    data-testid={`dropdown-item-row-remove-${i}`}
                    variant="plain"
                    aria-label="Remove item"
                    isDisabled={rowsToRender.length === 1 && !r.data.label && !r.data.value}
                    onClick={() => {
                      if (rowsToRender.length === 1) {
                        setDropdownItems([{ label: '', value: '' }]);
                      } else {
                        setDropdownItems(dropdownItems.filter((_, index) => i !== index));
                      }
                    }}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        <Button
          data-testid="add-dropdown-table-item"
          variant="link"
          icon={<PlusCircleIcon />}
          onClick={() => {
            setDropdownItems([...dropdownItems, { label: '', value: '' }]);
          }}
        >
          Add dropdown item
        </Button>
      </FormGroup>
    </ExpandableFormSection>
  );
};

export default DropdownAdvancedPropertiesForm;
