import React, { useState } from 'react';
import { useNamespaceSelector, useModularArchContext } from 'mod-arch-core';
import { MenuToggle } from '@patternfly/react-core/dist/esm/components/MenuToggle';
import {
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core/dist/esm/components/Select';

interface NamespaceSelectorProps {
  onSelect?: (namespace: string) => void;
  className?: string;
  isDisabled?: boolean;
}

const NamespaceSelector: React.FC<NamespaceSelectorProps> = ({
  onSelect,
  className,
  isDisabled: externalDisabled,
}) => {
  const { namespaces = [], preferredNamespace, updatePreferredNamespace } = useNamespaceSelector();
  const { config } = useModularArchContext();
  const [isOpen, setIsOpen] = useState(false);

  const isMandatoryNamespace = Boolean(config.mandatoryNamespace);
  const isDisabled = externalDisabled || isMandatoryNamespace || namespaces.length === 0;

  const selectedValue = preferredNamespace?.name || namespaces[0]?.name || '';

  const handleSelect = (
    _event: React.MouseEvent | undefined,
    value: string | number | undefined,
  ) => {
    if (typeof value !== 'string' || !value) {
      return;
    }

    if (!isMandatoryNamespace) {
      updatePreferredNamespace({ name: value });
    }

    if (onSelect) {
      onSelect(value);
    }

    setIsOpen(false);
  };

  const toggle = (toggleRef: React.Ref<HTMLButtonElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setIsOpen(!isOpen)}
      isExpanded={isOpen}
      isDisabled={isDisabled}
      className={className}
      style={{ minWidth: '200px' }}
      data-testid="namespace-selector-toggle"
    >
      {selectedValue || 'Select a project'}
    </MenuToggle>
  );

  return (
    <Select
      isOpen={isOpen}
      selected={selectedValue}
      onSelect={handleSelect}
      onOpenChange={setIsOpen}
      toggle={toggle}
      shouldFocusToggleOnSelect
      data-testid="namespace-selector"
    >
      <SelectList>
        {namespaces.map((namespace) => (
          <SelectOption key={namespace.name} value={namespace.name}>
            {namespace.name}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};

export default NamespaceSelector;
