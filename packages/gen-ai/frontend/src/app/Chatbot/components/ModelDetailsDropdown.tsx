import * as React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
} from '@patternfly/react-core';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { getLlamaModelDisplayName } from '~/app/utilities';

interface ModelDetailsDropdownProps {
  selectedModel: string;
  onModelChange: (value: string) => void;
}

const ModelDetailsDropdown: React.FunctionComponent<ModelDetailsDropdownProps> = ({
  selectedModel,
  onModelChange,
}) => {
  const { models, aiModels } = React.useContext(ChatbotContext);
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
      popperProps={{
        appendTo: () => document.body,
        position: 'right',
      }}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          ref={toggleRef}
          isDisabled={models.length === 0}
          isFullWidth
          onClick={() => setIsOpen(!isOpen)}
          isExpanded={isOpen}
        >
          {getLlamaModelDisplayName(selectedModel, aiModels) || placeholder}
        </MenuToggle>
      )}
      shouldFocusToggleOnSelect
    >
      <DropdownList style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {models.map((option) => (
          <DropdownItem value={option.id} key={option.id}>
            {getLlamaModelDisplayName(option.id, aiModels)}
          </DropdownItem>
        ))}
      </DropdownList>
    </Dropdown>
  );
};

export default ModelDetailsDropdown;
