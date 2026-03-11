import React from 'react';
import {
  MenuToggle,
  MenuToggleElement,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import { useNamespaceSelector } from 'mod-arch-core';

const NamespaceSelector: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { namespaces, preferredNamespace, updatePreferredNamespace } = useNamespaceSelector();

  const selectedNamespace = preferredNamespace?.name ?? namespaces[0]?.name;

  const onSelect = (
    _event: React.MouseEvent<Element> | undefined,
    value: string | number | undefined,
  ) => {
    if (value) {
      updatePreferredNamespace({ name: String(value) });
    }
    setIsOpen(false);
  };

  return (
    <Select
      isOpen={isOpen}
      selected={selectedNamespace}
      onSelect={onSelect}
      onOpenChange={(open) => setIsOpen(open)}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          ref={toggleRef}
          onClick={() => setIsOpen(!isOpen)}
          isExpanded={isOpen}
          isDisabled={namespaces.length === 0}
        >
          {selectedNamespace || 'Select namespace'}
        </MenuToggle>
      )}
    >
      <SelectList>
        {namespaces.map((ns) => (
          <SelectOption key={ns.name} value={ns.name}>
            {ns.name}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};

export default NamespaceSelector;
