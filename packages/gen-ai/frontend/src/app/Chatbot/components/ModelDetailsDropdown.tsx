import * as React from 'react';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  Icon,
  MenuToggle,
  MenuToggleElement,
  Tooltip,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { getLlamaModelDisplayName, getLlamaModelStatus } from '~/app/utilities';

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
        {models.map((option) => {
          const isDisabled = getLlamaModelStatus(option.id, aiModels) !== 'Running';
          return (
            <DropdownItem
              value={option.id}
              key={option.id}
              actions={
                isDisabled ? (
                  <Tooltip content="This model is unavailable. Check the model's deployment status and resolve any issues. Update the playground's configuration to refresh the list.">
                    <Icon
                      status="danger"
                      iconSize="md"
                      style={{ marginRight: 'var(--pf-t--global--spacer--md)' }}
                    >
                      <ExclamationCircleIcon />
                    </Icon>
                  </Tooltip>
                ) : null
              }
              isAriaDisabled={isDisabled}
            >
              {getLlamaModelDisplayName(option.id, aiModels)}
            </DropdownItem>
          );
        })}
      </DropdownList>
    </Dropdown>
  );
};

export default ModelDetailsDropdown;
