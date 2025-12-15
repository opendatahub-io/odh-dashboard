import React from 'react';
import {
  Button,
  Checkbox,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
  MenuToggle,
  NumberInput,
  Split,
  SplitItem,
  ValidatedOptions,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { ZodIssue } from 'zod';
import { RateLimit } from '~/app/types/tier';

const UNIT_OPTIONS: { value: RateLimit['unit']; label: string }[] = [
  { value: 'hour', label: 'hour' },
  { value: 'minute', label: 'minute' },
  { value: 'second', label: 'second' },
  { value: 'millisecond', label: 'ms' },
];

type RateLimitCheckboxProps = {
  id: string;
  type: 'token' | 'request';
  rateLimits: RateLimit[];
  onChange: (rateLimits: RateLimit[]) => void;
  isChecked: boolean;
  onToggle: (checked: boolean) => void;
  defaultRateLimit: RateLimit;
  validationIssues: ZodIssue[];
};

type RateLimitRowProps = {
  id: string;
  type: 'token' | 'request';
  rateLimit: RateLimit;
  onChange: (rateLimit: RateLimit) => void;
  onRemove?: () => void;
  showRemove: boolean;
  availableUnits: RateLimit['unit'][];
  validationIssues: ZodIssue[];
};

const RateLimitRow: React.FC<RateLimitRowProps> = ({
  id,
  type,
  rateLimit,
  onChange,
  onRemove,
  showRemove,
  availableUnits,
  validationIssues,
}) => {
  const [unitDropdownOpen, setUnitDropdownOpen] = React.useState(false);

  // Get the display label for the selected unit (e.g., "ms" for millisecond), falling back to the raw value
  const selectedUnitLabel =
    UNIT_OPTIONS.find((opt) => opt.value === rateLimit.unit)?.label ?? rateLimit.unit;

  // Show available units plus the currently selected one
  const selectableOptions = UNIT_OPTIONS.filter(
    (opt) => availableUnits.includes(opt.value) || opt.value === rateLimit.unit,
  );

  const hasValidationIssues = validationIssues.length > 0;

  return (
    <Split hasGutter>
      <SplitItem>
        <NumberInput
          validated={hasValidationIssues ? ValidatedOptions.error : ValidatedOptions.default}
          id={`${id}-count`}
          data-testid={`${id}-count`}
          value={rateLimit.tokens}
          min={1}
          onMinus={() => onChange({ ...rateLimit, tokens: Math.max(1, rateLimit.tokens - 1) })}
          onPlus={() => onChange({ ...rateLimit, tokens: rateLimit.tokens + 1 })}
          onChange={(event: React.FormEvent<HTMLInputElement>) => {
            const parsedValue = parseInt(event.currentTarget.value, 10);
            if (!Number.isNaN(parsedValue)) {
              onChange({ ...rateLimit, tokens: Math.max(1, parsedValue) });
            }
          }}
        />
      </SplitItem>
      <SplitItem style={{ alignSelf: 'center' }}>
        {type === 'token' ? 'tokens' : 'requests'} per
      </SplitItem>
      <SplitItem>
        <NumberInput
          validated={hasValidationIssues ? ValidatedOptions.error : ValidatedOptions.default}
          id={`${id}-time`}
          data-testid={`${id}-time`}
          value={rateLimit.time}
          min={1}
          max={99999}
          onMinus={() => onChange({ ...rateLimit, time: Math.max(1, rateLimit.time - 1) })}
          onPlus={() => onChange({ ...rateLimit, time: Math.min(99999, rateLimit.time + 1) })}
          onChange={(event: React.FormEvent<HTMLInputElement>) => {
            const parsedValue = parseInt(event.currentTarget.value, 10);
            if (!Number.isNaN(parsedValue)) {
              onChange({ ...rateLimit, time: Math.max(1, Math.min(99999, parsedValue)) });
            }
          }}
        />
      </SplitItem>
      <SplitItem>
        <Dropdown
          isOpen={unitDropdownOpen}
          onOpenChange={setUnitDropdownOpen}
          toggle={(toggleRef) => (
            <MenuToggle
              ref={toggleRef}
              onClick={() => setUnitDropdownOpen(!unitDropdownOpen)}
              isExpanded={unitDropdownOpen}
              data-testid={`${id}-unit`}
              style={{ minWidth: 100 }}
            >
              {selectedUnitLabel}
            </MenuToggle>
          )}
        >
          <DropdownList>
            {selectableOptions.map((option) => (
              <DropdownItem
                key={option.value}
                onClick={() => {
                  onChange({ ...rateLimit, unit: option.value });
                  setUnitDropdownOpen(false);
                }}
              >
                {option.label}
              </DropdownItem>
            ))}
          </DropdownList>
        </Dropdown>
      </SplitItem>
      {showRemove && (
        <SplitItem>
          <Button
            variant="plain"
            aria-label="Remove rate limit"
            onClick={onRemove}
            data-testid={`${id}-remove`}
          >
            <MinusCircleIcon />
          </Button>
        </SplitItem>
      )}
    </Split>
  );
};

export const RateLimitCheckbox: React.FC<RateLimitCheckboxProps> = ({
  id,
  type,
  rateLimits,
  onChange,
  isChecked,
  onToggle,
  defaultRateLimit,
  validationIssues,
}) => {
  // Get units that are already used
  const usedUnits = rateLimits.map((limit) => limit.unit);
  // Get units that are still available
  const availableUnits = UNIT_OPTIONS.map((opt) => opt.value).filter(
    (unit) => !usedUnits.includes(unit),
  );

  const handleRowChange = (index: number, updatedRateLimit: RateLimit) => {
    const updatedRateLimits = [...rateLimits];
    updatedRateLimits[index] = updatedRateLimit;
    onChange(updatedRateLimits);
  };

  const handleRemove = (index: number) => {
    const updatedRateLimits = rateLimits.filter((_, i) => i !== index);
    onChange(updatedRateLimits);
  };

  const handleAdd = () => {
    if (availableUnits.length > 0) {
      onChange([...rateLimits, { ...defaultRateLimit, unit: availableUnits[0] }]);
    }
  };

  return (
    <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
      <FlexItem>
        <Checkbox
          id={id}
          label={type === 'token' ? 'Enforce token rate limit' : 'Enforce request rate limit'}
          isChecked={isChecked}
          onChange={(_event, checked) => onToggle(checked)}
        />
      </FlexItem>
      {validationIssues.length > 0 && (
        <FlexItem>
          <HelperText>
            <HelperTextItem>
              {validationIssues.map((issue) => issue.message).join(', ')}
            </HelperTextItem>
          </HelperText>
        </FlexItem>
      )}
      {isChecked && (
        <FlexItem>
          <Flex
            direction={{ default: 'column' }}
            spaceItems={{ default: 'spaceItemsSm' }}
            style={{ marginLeft: 24 }}
          >
            {rateLimits.map((rateLimit, index) => (
              <FlexItem key={index}>
                <RateLimitRow
                  id={`${id}-${index}`}
                  type={type}
                  rateLimit={rateLimit}
                  onChange={(updatedRateLimit) => handleRowChange(index, updatedRateLimit)}
                  onRemove={() => handleRemove(index)}
                  showRemove={rateLimits.length > 1}
                  availableUnits={availableUnits}
                  validationIssues={validationIssues}
                />
              </FlexItem>
            ))}
            {availableUnits.length > 0 && (
              <FlexItem>
                <Button
                  variant="link"
                  icon={<PlusCircleIcon />}
                  onClick={handleAdd}
                  data-testid={`${id}-add`}
                >
                  Add {type} rate limit
                </Button>
              </FlexItem>
            )}
            <FlexItem>
              <HelperText>
                <HelperTextItem>
                  {type === 'token'
                    ? 'Tokens beyond these limits will be blocked.'
                    : 'Requests beyond these limits will be blocked.'}
                </HelperTextItem>
              </HelperText>
            </FlexItem>
          </Flex>
        </FlexItem>
      )}
    </Flex>
  );
};
