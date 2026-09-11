import * as React from 'react';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import { PROVIDER_TYPE_OPTIONS } from '~/app/pages/external-providers/const';

type ProviderTypeFieldProps = {
  provider: string;
  onProviderChange: (provider: string) => void;
  validationMessage?: string;
};

const ProviderTypeField: React.FC<ProviderTypeFieldProps> = ({
  provider,
  onProviderChange,
  validationMessage,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedLabel =
    PROVIDER_TYPE_OPTIONS.find((option) => option.value === provider)?.label ??
    'Select a provider type';

  return (
    <FormGroup label="Provider type" isRequired fieldId="provider-type">
      <FormHelperText>
        <HelperText>
          <HelperTextItem>Select a known provider type.</HelperTextItem>
        </HelperText>
      </FormHelperText>
      <Select
        id="provider-type"
        isOpen={isOpen}
        selected={provider}
        onSelect={(_event, value) => {
          onProviderChange(String(value));
          setIsOpen(false);
        }}
        onOpenChange={(nextOpen) => setIsOpen(nextOpen)}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => setIsOpen((open) => !open)}
            isExpanded={isOpen}
            isFullWidth
            data-testid="provider-type-toggle"
          >
            {provider ? selectedLabel : 'Select a provider'}
          </MenuToggle>
        )}
      >
        <SelectList>
          {PROVIDER_TYPE_OPTIONS.map((option) => (
            <SelectOption
              key={option.value}
              value={option.value}
              data-testid={`provider-type-option-${option.value}`}
            >
              {option.label}
            </SelectOption>
          ))}
        </SelectList>
      </Select>
      {validationMessage && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem variant="error">{validationMessage}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </FormGroup>
  );
};

export default ProviderTypeField;
