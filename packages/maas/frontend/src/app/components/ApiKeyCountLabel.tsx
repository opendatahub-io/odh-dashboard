import * as React from 'react';
import { Label } from '@patternfly/react-core';
import { KeyIcon } from '@patternfly/react-icons';

/** Matches the BFF's subscriptionKeyCountCap constant in api_keys_handlers.go */
export const SUBSCRIPTION_KEY_COUNT_CAP = 10;

type ApiKeyCountLabelProps = {
  keyCount?: number | null;
};

/**
 * Displays a compact API key count badge. Returns null when keyCount is null/undefined.
 * Shows "10+" when keyCount is at or above the BFF search cap (grey for 0, green for >0).
 */
const ApiKeyCountLabel: React.FC<ApiKeyCountLabelProps> = ({ keyCount }) => {
  if (keyCount == null) {
    return null;
  }

  const isCapped = keyCount >= SUBSCRIPTION_KEY_COUNT_CAP;
  const displayCount = isCapped ? `${SUBSCRIPTION_KEY_COUNT_CAP}+` : `${keyCount}`;
  const displayUnit = !isCapped && keyCount === 1 ? 'active key' : 'active keys';

  return (
    <Label isCompact icon={<KeyIcon />} color={keyCount > 0 ? 'green' : 'grey'}>
      {`${displayCount} ${displayUnit}`}
    </Label>
  );
};

export default ApiKeyCountLabel;
