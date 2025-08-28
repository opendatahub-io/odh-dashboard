import * as React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { LlamaModel } from '~/app/types';

interface ModelDetailsDropdownProps {
  models: LlamaModel[];
  selectedModel: string;
  onModelChange: (value: string) => void;
}

const ModelDetailsDropdown: React.FunctionComponent<ModelDetailsDropdownProps> = ({
  models,
  selectedModel,
  onModelChange,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const placeholder = models.length === 0 ? 'No models available' : 'Select a model';
  const onModelSelect = (value: string) => {
    setIsOpen(false);
    onModelChange(value);
  };
  return (
    <Dropdown
      isOpen={isOpen}
      onSelect={(_, value) => {
        if (typeof value === 'string') {
          onModelSelect(value);
        }
      }}
      onOpenChange={(isOpenChange: boolean) => setIsOpen(isOpenChange)}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          ref={toggleRef}
          isDisabled={models.length === 0}
          isFullWidth
          onClick={() => setIsOpen(!isOpen)}
          isExpanded={isOpen}
        >
          {selectedModel || placeholder}
        </MenuToggle>
      )}
      shouldFocusToggleOnSelect
    >
      <DropdownList>
        {models.map((option) => (
          <DropdownItem value={option.identifier} key={option.identifier}>
            {option.identifier}
          </DropdownItem>
        ))}
      </DropdownList>
    </Dropdown>
  );
};

export default ModelDetailsDropdown;
