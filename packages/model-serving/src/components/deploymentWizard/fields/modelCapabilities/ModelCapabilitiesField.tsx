import React from 'react';
import {
  Button,
  Divider,
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  FormGroup,
  Label,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { z } from 'zod';
import type {
  WizardField,
  WizardReviewSection,
} from '@odh-dashboard/model-serving/shared/types/form-data';
import {
  WELL_KNOWN_MODEL_CAPABILITIES,
  getModelCapabilityLabelColor,
  type ModelCapability,
} from '../../../../shared/modelCapabilities';

export type ModelCapabilitiesFieldData = ModelCapability[];

export const MODEL_CAPABILITIES_FIELD_ID = 'modelCapabilities';

const modelCapabilitiesFieldSchema = z.array(z.string());

const setFieldData = (value: ModelCapabilitiesFieldData): ModelCapabilitiesFieldData => value;

const getInitialFieldData = (
  existingFieldData?: ModelCapabilitiesFieldData,
): ModelCapabilitiesFieldData => existingFieldData ?? [];

type ModelCapabilitiesFieldComponentProps = {
  id: string;
  value?: ModelCapabilitiesFieldData;
  onChange: (value: ModelCapabilitiesFieldData) => void;
  isDisabled?: boolean;
};

const ModelCapabilitiesFieldComponent: React.FC<ModelCapabilitiesFieldComponentProps> = ({
  id,
  value: selectedCapabilities = [],
  onChange,
  isDisabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [customInput, setCustomInput] = React.useState('');
  const toggleRef = React.useRef<HTMLButtonElement>(null);

  const availableWellKnown = WELL_KNOWN_MODEL_CAPABILITIES.filter(
    (cap) => !selectedCapabilities.includes(cap),
  );

  const handleAddWellKnown = (capability: string) => {
    onChange([...selectedCapabilities, capability]);
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !selectedCapabilities.includes(trimmed)) {
      onChange([...selectedCapabilities, trimmed]);
      setCustomInput('');
    }
  };

  const handleRemove = (capability: string) => {
    onChange(selectedCapabilities.filter((c) => c !== capability));
  };

  const handleCustomKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddCustom();
    }
  };

  return (
    <StackItem data-testid="model-capabilities-field">
      <FormGroup
        label="Model capabilities"
        fieldId={`${id}-capabilities`}
        data-testid="model-capabilities-field-group"
      >
        <Flex
          gap={{ default: 'gapSm' }}
          alignItems={{ default: 'alignItemsCenter' }}
          flexWrap={{ default: 'wrap' }}
        >
          {selectedCapabilities.map((cap) => (
            <FlexItem key={cap}>
              <Label
                isCompact
                color={getModelCapabilityLabelColor(cap)}
                onClose={isDisabled ? undefined : () => handleRemove(cap)}
                data-testid={`capability-label-${cap}`}
              >
                {cap}
              </Label>
            </FlexItem>
          ))}
          <FlexItem>
            <Dropdown
              isOpen={isOpen}
              onSelect={(_event, dropdownValue) => {
                if (typeof dropdownValue === 'string') {
                  handleAddWellKnown(dropdownValue);
                }
                setIsOpen(false);
              }}
              onOpenChange={(open) => setIsOpen(open)}
              popperProps={{ appendTo: () => document.body }}
              toggle={{
                toggleNode: (
                  <Button
                    ref={toggleRef}
                    variant="link"
                    icon={<PlusCircleIcon />}
                    isDisabled={isDisabled}
                    onClick={() => setIsOpen(!isOpen)}
                    data-testid="add-capability-btn"
                  >
                    Add capability
                  </Button>
                ),
                toggleRef,
              }}
            >
              <DropdownList>
                {availableWellKnown.length > 0 && (
                  <>
                    <DropdownGroup label="Common capabilities">
                      {availableWellKnown.map((cap) => (
                        <DropdownItem
                          key={cap}
                          value={cap}
                          data-testid={`well-known-capability-${cap}`}
                        >
                          <Label isCompact color={getModelCapabilityLabelColor(cap)}>
                            {cap}
                          </Label>
                        </DropdownItem>
                      ))}
                    </DropdownGroup>
                    <Divider component="li" />
                  </>
                )}
                <DropdownItem
                  key="custom-input"
                  isAriaDisabled
                  onClick={(e) => e.stopPropagation()}
                  data-testid="custom-capability-row"
                >
                  <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem grow={{ default: 'grow' }}>
                      <TextInput
                        aria-label="Custom capability"
                        placeholder="Custom capability..."
                        value={customInput}
                        onChange={(_event, val) => setCustomInput(val)}
                        onKeyDown={handleCustomKeyDown}
                        onClick={(e) => e.stopPropagation()}
                        data-testid="custom-capability-input"
                      />
                    </FlexItem>
                    <FlexItem>
                      <Button
                        variant="secondary"
                        isDisabled={!customInput.trim()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddCustom();
                        }}
                        data-testid="add-custom-capability-btn"
                      >
                        Add
                      </Button>
                    </FlexItem>
                  </Flex>
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          </FlexItem>
        </Flex>
      </FormGroup>
    </StackItem>
  );
};

export type ModelCapabilitiesFieldType = WizardField<ModelCapabilitiesFieldData, undefined>;

const getReviewSections = (value: ModelCapabilitiesFieldData): WizardReviewSection[] => {
  if (value.length === 0) {
    return [];
  }
  return [
    {
      title: 'Advanced settings',
      items: [
        {
          key: 'modelCapabilities',
          label: 'Model capabilities',
          value: () => value.join(', '),
        },
      ],
    },
  ];
};

export const ModelCapabilitiesFieldWizardField: ModelCapabilitiesFieldType = {
  id: MODEL_CAPABILITIES_FIELD_ID,
  step: 'advancedOptions',
  type: 'addition',
  isActive: () => true,
  reducerFunctions: {
    setFieldData,
    getInitialFieldData,
    validationSchema: modelCapabilitiesFieldSchema,
  },
  component: ModelCapabilitiesFieldComponent,
  getReviewSections,
};
