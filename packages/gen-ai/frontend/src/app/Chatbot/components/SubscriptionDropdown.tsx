import * as React from 'react';
import { FormGroup, MenuToggle, Select, SelectList, SelectOption } from '@patternfly/react-core';
import FieldGroupHelpLabelIcon from '@odh-dashboard/ui-core/components/FieldGroupHelpLabelIcon';
import { ChatbotContext } from '~/app/context/ChatbotContext';
import { SubscriptionInfo } from '~/app/types';
import { isMaasLlamaModelId, splitLlamaModelId } from '~/app/utilities/utils';

interface SubscriptionDropdownProps {
  selectedModel: string;
  selectedSubscription: string;
  onSubscriptionChange: (subscription: string) => void;
  isDisabled?: boolean;
  /** When true, treat selectedModel as a raw MaaS model ID (skip LlamaStack prefix check) */
  isMaaSModel?: boolean;
  /** Custom label for the FormGroup (defaults to "Subscription") */
  label?: string;
  /** Custom help text tooltip (defaults to generic subscription help) */
  helpText?: string;
  /** Additional className on the FormGroup wrapper */
  className?: string;
}

const isValidSubscription = (s: unknown): s is SubscriptionInfo =>
  s != null &&
  typeof s === 'object' &&
  'name' in s &&
  typeof s.name === 'string' &&
  s.name.trim() !== '' &&
  (!('displayName' in s) || s.displayName == null || typeof s.displayName === 'string') &&
  (!('description' in s) || s.description == null || typeof s.description === 'string');

const DEFAULT_HELP_TEXT =
  'Select the subscription to use for this model. Subscriptions control access and rate limits for model endpoints.';

const SubscriptionDropdown: React.FunctionComponent<SubscriptionDropdownProps> = ({
  selectedModel,
  selectedSubscription,
  onSubscriptionChange,
  isDisabled = false,
  isMaaSModel = false,
  label = 'Subscription',
  helpText = DEFAULT_HELP_TEXT,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { maasModels } = React.useContext(ChatbotContext);

  const subscriptions: SubscriptionInfo[] = React.useMemo(() => {
    if (!selectedModel) {
      return [];
    }
    if (!isMaaSModel && !isMaasLlamaModelId(selectedModel)) {
      return [];
    }
    const maasModelId = isMaaSModel ? selectedModel : splitLlamaModelId(selectedModel).id;
    const matchingModel = maasModels.find((m) => m.model_id === maasModelId);
    const subs = matchingModel?.subscriptions;
    // Validate each subscription has the required name field before returning
    return Array.isArray(subs) ? subs.filter(isValidSubscription) : [];
  }, [selectedModel, isMaaSModel, maasModels]);

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
      label={label}
      labelHelp={<FieldGroupHelpLabelIcon content={helpText} />}
      className={className}
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
            isFullWidth
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
