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
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { getLlamaModelDisplayName, isLlamaModelEnabled } from '~/app/utilities';
import useFetchBFFConfig from '~/app/hooks/useFetchBFFConfig';

interface ModelDetailsDropdownProps {
  selectedModel: string;
  onModelChange: (value: string) => void;
}

const ModelDetailsDropdown: React.FunctionComponent<ModelDetailsDropdownProps> = ({
  selectedModel,
  onModelChange,
}) => {
  const { models, aiModels, maasModels } = React.useContext(ChatbotContext);
  const { data: bffConfig } = useFetchBFFConfig();
  const [isOpen, setIsOpen] = React.useState(false);

  const placeholder = models.length === 0 ? 'No models available' : 'Select a model';
  const onModelSelect = (value: string) => {
    setIsOpen(false);
    onModelChange(value);
    fireMiscTrackingEvent('Playground Model Dropdown Option Selected', {
      selectedModel: getLlamaModelDisplayName(value, aiModels),
    });
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
          data-testid="model-selector-toggle"
        >
          {getLlamaModelDisplayName(selectedModel, aiModels) || placeholder}
        </MenuToggle>
      )}
      shouldFocusToggleOnSelect
    >
      <DropdownList style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {models.map((option) => {
          const isDisabled = !isLlamaModelEnabled(
            option.id,
            aiModels,
            maasModels,
            bffConfig?.isCustomLSD ?? false,
          );
          return (
            <DropdownItem
              value={option.id}
              key={option.id}
              data-testid={`model-option-${option.id}`}
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
