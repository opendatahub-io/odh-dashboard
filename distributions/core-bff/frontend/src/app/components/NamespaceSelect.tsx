import React, { useState } from 'react';
import { MenuToggle, Select, SelectList, SelectOption } from '@patternfly/react-core';
import { useNamespaceSelector } from '~/app/context/NamespaceContext';

const NamespaceSelect: React.FC = () => {
  const { namespaces, selectedNamespace, setSelectedNamespace, loaded } = useNamespaceSelector();
  const [isOpen, setIsOpen] = useState(false);

  if (!loaded || namespaces.length === 0) {
    return null;
  }

  const toggle = (toggleRef: React.Ref<HTMLButtonElement>) => (
    <MenuToggle
      ref={toggleRef}
      onClick={() => setIsOpen((prev) => !prev)}
      isExpanded={isOpen}
      size="sm"
    >
      {selectedNamespace}
    </MenuToggle>
  );

  return (
    <Select
      isOpen={isOpen}
      selected={selectedNamespace}
      onSelect={(_event, value) => {
        setSelectedNamespace(String(value));
        setIsOpen(false);
      }}
      onOpenChange={setIsOpen}
      toggle={toggle}
    >
      <SelectList style={{ maxHeight: '200px', overflow: 'auto' }}>
        {namespaces.map((ns) => (
          <SelectOption key={ns} value={ns}>
            {ns}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};

export default NamespaceSelect;
