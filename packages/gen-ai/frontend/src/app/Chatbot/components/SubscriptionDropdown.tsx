import * as React from 'react';
import { FormGroup, MenuToggle, Select, SelectList, SelectOption } from '@patternfly/react-core';
import FieldGroupHelpLabelIcon from '@odh-dashboard/internal/components/FieldGroupHelpLabelIcon';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { SubscriptionInfo } from '~/app/types';
import { isMaasLlamaModelId, splitLlamaModelId } from '~/app/utilities/utils';

interface SubscriptionDropdownProps {
  selectedModel: string;
  selectedSubscription: string;
  onSubscriptionChange: (subscription: string) => void;
  isDisabled?: boolean;
}

const SubscriptionDropdown: React.FunctionComponent<SubscriptionDropdownProps> = ({
  selectedModel,
  selectedSubscription,
  onSubscriptionChange,
  isDisabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { maasModels } = React.useContext(ChatbotContext);

  const subscriptions: SubscriptionInfo[] = React.useMemo(() => {
    if (!selectedModel) {
      return [];
    }
    // Only look up subscriptions for MaaS models — without this guard, a namespace model
    // sharing the same base model_id as a MaaS model would incorrectly pull up MaaS subscriptions.
    if (!isMaasLlamaModelId(selectedModel)) {
      return [];
    }
    const { id: maasModelId } = splitLlamaModelId(selectedModel);
    const matchingModel = maasModels.find((m) => m.id === maasModelId);
    return matchingModel?.subscriptions ?? [];
  }, [selectedModel, maasModels]);

  // Auto-select highest-priority subscription when current selection is empty or invalid.
  // Subscriptions arrive pre-sorted by priority (desc) from the MaaS API.
  // Skip mutation when the component is disabled (e.g. preview mode).
  React.useEffect(() => {
    if (isDisabled || subscriptions.length === 0) {
      return;
    }
    const isCurrentSelectionValid = subscriptions.some((s) => s.name === selectedSubscription);
    if (!isCurrentSelectionValid) {
      onSubscriptionChange(subscriptions[0].name);
    }
  }, [isDisabled, subscriptions, selectedSubscription, onSubscriptionChange]);

  if (subscriptions.length === 0) {
    return null;
  }

  const selectedSub = subscriptions.find((s) => s.name === selectedSubscription);
  const toggleLabel = selectedSub
    ? selectedSub.displayName || selectedSub.name
    : 'Select a subscription';

  const handleSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | undefined,
    value: string | number | undefined,
  ) => {
    if (typeof value === 'string') {
      onSubscriptionChange(value);
    }
    setIsOpen(false);
  };

  return (
    <FormGroup
      fieldId="subscription-selector"
      label="Subscription"
      labelHelp={
        <FieldGroupHelpLabelIcon content="Select the subscription to use for this model. Subscriptions control access and rate limits for model endpoints." />
      }
    >
      <Select
        id="subscription-selector"
        isOpen={isOpen}
        selected={selectedSubscription}
        onSelect={handleSelect}
        onOpenChange={setIsOpen}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            onClick={() => setIsOpen(!isOpen)}
            isExpanded={isOpen}
            isDisabled={isDisabled}
            style={{ width: '100%' }}
            data-testid="subscription-selector-toggle"
          >
            {toggleLabel}
          </MenuToggle>
        )}
      >
        <SelectList>
          {subscriptions.map((sub) => (
            <SelectOption key={sub.name} value={sub.name} description={sub.description}>
              {sub.displayName || sub.name}
            </SelectOption>
          ))}
        </SelectList>
      </Select>
    </FormGroup>
  );
};

export default SubscriptionDropdown;
