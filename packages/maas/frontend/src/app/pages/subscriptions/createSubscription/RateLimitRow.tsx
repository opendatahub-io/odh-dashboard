import React from 'react';
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  NumberInput,
  Split,
  SplitItem,
  Stack,
  StackItem,
  ValidatedOptions,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, MinusCircleIcon } from '@patternfly/react-icons';
import { RateLimit } from '~/app/types/subscriptions';
import { UNIT_OPTIONS } from '~/app/utilities/rateLimits';

export type RateLimitRowProps = {
  id: string;
  rateLimit: RateLimit;
  onChange: (rateLimit: RateLimit) => void;
  onRemove?: () => void;
  showRemove: boolean;
  availableUnits: RateLimit['unit'][];
  countError?: string;
  timeError?: string;
};

const COUNT_STEP = 1000;

export const RateLimitRow: React.FC<RateLimitRowProps> = ({
  id,
  rateLimit,
  onChange,
  onRemove,
  showRemove,
  availableUnits,
  countError,
  timeError,
}) => {
  const [unitDropdownOpen, setUnitDropdownOpen] = React.useState(false);

  // Get the display label for the selected unit, falling back to the raw value
  const selectedUnitLabel =
    UNIT_OPTIONS.find((opt) => opt.value === rateLimit.unit)?.label ?? rateLimit.unit;

  // Show available units plus the currently selected one
  const selectableOptions = UNIT_OPTIONS.filter(
    (opt) => availableUnits.includes(opt.value) || opt.value === rateLimit.unit,
  );

  const hasCountError = countError != null;
  const hasTimeError = timeError != null;

  return (
    <Stack hasGutter>
      <StackItem>
        <Split hasGutter>
          <SplitItem>
            <NumberInput
              validated={hasCountError ? ValidatedOptions.error : ValidatedOptions.default}
              id={`${id}-count`}
              data-testid={`${id}-count`}
              value={Number.isNaN(rateLimit.count) ? '' : rateLimit.count}
              min={1}
              max={Number.MAX_SAFE_INTEGER}
              onMinus={() =>
                onChange({
                  ...rateLimit,
                  count: Math.max(1, (rateLimit.count || COUNT_STEP) - COUNT_STEP),
                })
              }
              onPlus={() =>
                onChange({
                  ...rateLimit,
                  count: Math.min(Number.MAX_SAFE_INTEGER, (rateLimit.count || 0) + COUNT_STEP),
                })
              }
              onChange={(event: React.FormEvent<HTMLInputElement>) => {
                const inputValue = event.currentTarget.value;
                if (inputValue === '') {
                  onChange({ ...rateLimit, count: NaN });
                } else {
                  const parsedValue = parseInt(inputValue, 10);
                  if (!Number.isNaN(parsedValue)) {
                    onChange({
                      ...rateLimit,
                      count: Math.min(Number.MAX_SAFE_INTEGER, parsedValue),
                    });
                  }
                }
              }}
            />
          </SplitItem>
          <SplitItem style={{ alignSelf: 'center' }}>tokens per</SplitItem>
          <SplitItem>
            <NumberInput
              validated={hasTimeError ? ValidatedOptions.error : ValidatedOptions.default}
              id={`${id}-time`}
              data-testid={`${id}-time`}
              value={Number.isNaN(rateLimit.time) ? '' : rateLimit.time}
              min={1}
              max={Number.MAX_SAFE_INTEGER}
              onMinus={() =>
                onChange({ ...rateLimit, time: Math.max(1, (rateLimit.time || 1) - 1) })
              }
              onPlus={() =>
                onChange({
                  ...rateLimit,
                  time: Math.min(Number.MAX_SAFE_INTEGER, (rateLimit.time || 0) + 1),
                })
              }
              onChange={(event: React.FormEvent<HTMLInputElement>) => {
                const inputValue = event.currentTarget.value;
                if (inputValue === '') {
                  onChange({ ...rateLimit, time: NaN });
                } else {
                  const parsedValue = parseInt(inputValue, 10);
                  if (!Number.isNaN(parsedValue)) {
                    onChange({
                      ...rateLimit,
                      time: Math.min(Number.MAX_SAFE_INTEGER, parsedValue),
                    });
                  }
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
      </StackItem>
      {(hasCountError || hasTimeError) && (
        <StackItem>
          <FormHelperText>
            <HelperText>
              <HelperTextItem icon={<ExclamationCircleIcon />} variant="error">
                {countError || timeError}
              </HelperTextItem>
            </HelperText>
          </FormHelperText>
        </StackItem>
      )}
    </Stack>
  );
};
