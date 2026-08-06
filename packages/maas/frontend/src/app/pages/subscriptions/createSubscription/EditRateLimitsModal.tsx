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
import { RateLimit, TokenRateLimit } from '~/app/types/subscriptions';
import {
  DEFAULT_RATE_LIMIT,
  rateLimitsSchema,
  rateLimitExceedsMaxDigits,
  getCountError,
  getTimeError,
  getCountDigitError,
  getTimeDigitError,
  toRateLimit,
  toTokenRateLimit,
} from '~/app/utilities/rateLimits';
import { RateLimitRow } from './RateLimitRow';

type EditRateLimitsModalProps = {
  modelName: string;
  rateLimits: TokenRateLimit[];
  onSave: (rateLimits: TokenRateLimit[]) => void;
  onClose: () => void;
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

  const validation = rateLimitsSchema.safeParse(localLimits);
  const hasDigitLimitError = localLimits.some(rateLimitExceedsMaxDigits);
  const canSave = validation.success && !hasDigitLimitError;

  const handleRowChange = (index: number, updated: RateLimit) => {
    setLocalLimits((prev) => prev.map((item, i) => (i === index ? updated : item)));
  };

  const handleRemove = (index: number) => {
    setLocalLimits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAdd = () => {
    setLocalLimits((prev) => [...prev, { ...DEFAULT_RATE_LIMIT }]);
  };

  const handleSave = () => {
    setSubmitted(true);
    if (!canSave) {
      return;
    }
    onSave(localLimits.map(toTokenRateLimit));
    onClose();
  };

  const title = `Edit subscription token limits`;
  const description = (
    <>
      Set limits on the number of tokens that can be consumed by each member of the{' '}
      <b>{modelName}</b> in this subscription.
    </>
  );

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
                countError={submitted ? getCountError(limit) : undefined}
                timeError={submitted ? getTimeError(limit) : undefined}
                countDigitError={getCountDigitError(limit)}
                timeDigitError={getTimeDigitError(limit)}
              />
            </StackItem>
          ))}
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
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSave}
          isDisabled={hasDigitLimitError || (submitted && !canSave)}
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
