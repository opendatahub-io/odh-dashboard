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
import { RateLimit } from '~/app/types/tier';
import { TokenRateLimit } from '~/app/types/subscriptions';
import { UNIT_OPTIONS, toRateLimit, toTokenRateLimit } from '~/app/utilities/rateLimits';
import { RateLimitRow } from './RateLimitRow';

type EditRateLimitsModalProps = {
  modelName: string;
  rateLimits: TokenRateLimit[];
  onSave: (rateLimits: TokenRateLimit[]) => void;
  onClose: () => void;
};

const DEFAULT_RATE_LIMIT: RateLimit = { count: 1000, time: 1, unit: 'hour' };

const isValid = (limits: RateLimit[]): boolean =>
  limits.every((l) => l.count > 0 && !Number.isNaN(l.count) && l.time > 0 && !Number.isNaN(l.time));

const getCountError = (limit: RateLimit): string | undefined => {
  if (Number.isNaN(limit.count) || limit.count <= 0) {
    return 'Token count must be greater than 0';
  }
  return undefined;
};

const getTimeError = (limit: RateLimit): string | undefined => {
  if (Number.isNaN(limit.time) || limit.time <= 0) {
    return 'Time value must be greater than 0';
  }
  return undefined;
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
  const canSave = isValid(localLimits);

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
  const description = 'Set limits on the number of tokens that can be consumed.';

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
        <Button variant="primary" onClick={handleSave} data-testid="save-rate-limits">
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
