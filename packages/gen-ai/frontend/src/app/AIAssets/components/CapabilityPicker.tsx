import * as React from 'react';
import {
  Button,
  Dropdown,
  DropdownGroup,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Label,
  TextInput,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { getCapabilityDisplay } from '~/app/utilities/utils';

const COMMON_CAPABILITIES = [
  { id: 'vision', label: 'Vision' },
  { id: 'audio-transcription', label: 'Transcription' },
];

type LabelColor = 'green' | 'purple' | 'blue' | 'orange' | 'grey' | 'teal';
const COLOR_MAP: Record<string, LabelColor> = {
  green: 'green',
  purple: 'purple',
  blue: 'blue',
  orange: 'orange',
  grey: 'grey',
  teal: 'teal',
  cyan: 'teal',
};
const toLabelColor = (color: string): LabelColor => COLOR_MAP[color] ?? 'grey';

interface CapabilityPickerProps {
  selectedCapabilities: string[];
  onChange: (capabilities: string[]) => void;
  isDisabled?: boolean;
}

const CapabilityPicker: React.FunctionComponent<CapabilityPickerProps> = ({
  selectedCapabilities,
  onChange,
  isDisabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [customInput, setCustomInput] = React.useState('');
  const toggleRef = React.useRef<HTMLButtonElement>(null);

  const availableCommon = COMMON_CAPABILITIES.filter((c) => !selectedCapabilities.includes(c.id));

  const handleAddCommon = (id: string) => {
    onChange([...selectedCapabilities, id]);
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (trimmed && !selectedCapabilities.includes(trimmed)) {
      onChange([...selectedCapabilities, trimmed]);
      setCustomInput('');
    }
  };

  const handleRemove = (id: string) => {
    onChange(selectedCapabilities.filter((c) => c !== id));
  };

  const handleCustomKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddCustom();
    }
  };

  return (
    <Flex
      gap={{ default: 'gapSm' }}
      alignItems={{ default: 'alignItemsCenter' }}
      flexWrap={{ default: 'wrap' }}
    >
      {selectedCapabilities.map((cap) => {
        const display = getCapabilityDisplay(cap);
        const isCommon = COMMON_CAPABILITIES.some((c) => c.id === cap);
        return (
          <FlexItem key={cap}>
            <Label
              isCompact
              color={toLabelColor(isCommon ? display.color : 'grey')}
              onClose={isDisabled ? undefined : () => handleRemove(cap)}
              data-testid={`selected-capability-${cap}`}
            >
              {display.label}
            </Label>
          </FlexItem>
        );
      })}
      <FlexItem>
        <Dropdown
          isOpen={isOpen}
          onSelect={(_event, value) => {
            if (typeof value === 'string') {
              handleAddCommon(value);
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
            {availableCommon.length > 0 && (
              <DropdownGroup label="Common capabilities">
                {availableCommon.map((cap) => {
                  const display = getCapabilityDisplay(cap.id);
                  return (
                    <DropdownItem
                      key={cap.id}
                      value={cap.id}
                      data-testid={`common-capability-${cap.id}`}
                    >
                      <Label isCompact color={toLabelColor(display.color)}>
                        {display.label}
                      </Label>
                    </DropdownItem>
                  );
                })}
              </DropdownGroup>
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
                    onChange={(_event, value) => setCustomInput(value)}
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
  );
};

export default CapabilityPicker;
