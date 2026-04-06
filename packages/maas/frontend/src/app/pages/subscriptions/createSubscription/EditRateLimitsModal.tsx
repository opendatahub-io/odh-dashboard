import React from 'react';
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { z } from 'zod';
import { RateLimit, TokenRateLimit } from '~/app/types/subscriptions';
import { UNIT_OPTIONS, toRateLimit, toTokenRateLimit } from '~/app/utilities/rateLimits';
import { RateLimitRow } from './RateLimitRow';

type EditRateLimitsModalProps = {
  modelName: string;
  rateLimits: TokenRateLimit[];
  onSave: (rateLimits: TokenRateLimit[]) => void;
  onClose: () => void;
};

const DEFAULT_RATE_LIMIT: RateLimit = { count: 1000, time: 1, unit: 'hour' };

const rateLimitSchema = z.object({
  count: z
    .number()
    .int()
    .min(1, 'Token count must be greater than 0')
    .max(Number.MAX_SAFE_INTEGER, 'Token count exceeds maximum allowed value'),
  time: z
    .number()
    .int()
    .min(1, 'Time value must be greater than 0')
    .max(Number.MAX_SAFE_INTEGER, 'Time value exceeds maximum allowed value'),
  unit: z.enum(['day', 'hour', 'minute', 'second']),
});

const rateLimitsSchema = z
  .array(rateLimitSchema)
  .min(1, 'At least one token rate limit is required');

const getCountError = (limit: RateLimit): string | undefined => {
  if (Number.isNaN(limit.count)) {
    return 'Token count is required';
  }
  const result = rateLimitSchema.shape.count.safeParse(limit.count);
  return result.success ? undefined : result.error.issues[0].message;
};

const getTimeError = (limit: RateLimit): string | undefined => {
  if (Number.isNaN(limit.time)) {
    return 'Time value is required';
  }
  const result = rateLimitSchema.shape.time.safeParse(limit.time);
  return result.success ? undefined : result.error.issues[0].message;
};

const EditRateLimitsModal: React.FC<EditRateLimitsModalProps> = ({
  modelName,
  rateLimits,
  onSave,
  onClose,
}) => {
  const [localLimits, setLocalLimits] = React.useState<RateLimit[]>(() =>
    rateLimits.length > 0 ? rateLimits.map(toRateLimit) : [{ ...DEFAULT_RATE_LIMIT }],
  );
  const [submitted, setSubmitted] = React.useState(false);

  const usedUnits = localLimits.map((l) => l.unit);
  const availableUnits = UNIT_OPTIONS.map((opt) => opt.value).filter((u) => !usedUnits.includes(u));
  const validation = rateLimitsSchema.safeParse(localLimits);
  const canSave = validation.success;

  const handleRowChange = (index: number, updated: RateLimit) => {
    setLocalLimits((prev) => prev.map((item, i) => (i === index ? updated : item)));
  };

  const handleRemove = (index: number) => {
    setLocalLimits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    if (availableUnits.length > 0) {
      setLocalLimits((prev) => [...prev, { ...DEFAULT_RATE_LIMIT, unit: availableUnits[0] }]);
    }
  };

  const handleSave = () => {
    setSubmitted(true);
    if (!canSave) {
      return;
    }
    onSave(localLimits.map(toTokenRateLimit));
    onClose();
  };

  const title = `Edit token limits: ${modelName}`;
  const description =
    'Set limits on the number of tokens that can be consumed. At least one limit is required.';

  return (
    <Modal isOpen onClose={onClose} variant="medium" aria-label={title}>
      <ModalHeader title={title} description={description} />
      <ModalBody>
        <Stack hasGutter>
          {localLimits.map((limit, index) => (
            <StackItem key={index}>
              <RateLimitRow
                id={`edit-token-limit-${index}`}
                rateLimit={limit}
                onChange={(updated) => handleRowChange(index, updated)}
                onRemove={() => handleRemove(index)}
                showRemove={localLimits.length > 1}
                availableUnits={availableUnits}
                countError={submitted ? getCountError(limit) : undefined}
                timeError={submitted ? getTimeError(limit) : undefined}
              />
            </StackItem>
          ))}
          {availableUnits.length > 0 && (
            <StackItem>
              <Button
                variant="link"
                icon={<PlusCircleIcon />}
                onClick={handleAdd}
                data-testid="add-token-rate-limit"
              >
                Add token rate limit
              </Button>
            </StackItem>
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSave}
          isDisabled={submitted && !canSave}
          data-testid="save-rate-limits"
        >
          Save
        </Button>
        <Button variant="link" onClick={onClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default EditRateLimitsModal;
