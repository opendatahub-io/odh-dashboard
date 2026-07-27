import * as React from 'react';
import { capitalize, Label, Popover } from '@patternfly/react-core';
import type { LabelProps } from '@patternfly/react-core';
import {
  BanIcon,
  CheckCircleIcon,
  MinusCircleIcon,
  OutlinedClockIcon,
  OutlinedQuestionCircleIcon,
} from '@patternfly/react-icons';
import type { APIKeyDisplayStatus } from '~/app/types/api-key';

const getApiKeyStatusProps = (
  status: APIKeyDisplayStatus,
): { icon: React.ReactNode; status?: LabelProps['status']; variant?: LabelProps['variant'] } => {
  switch (status) {
    case 'active':
      return { icon: <CheckCircleIcon />, status: 'success' };
    case 'inactive':
      return { icon: <MinusCircleIcon />, variant: 'filled' };
    case 'expired':
      return { icon: <OutlinedClockIcon /> };
    case 'revoked':
      return { icon: <BanIcon />, status: 'danger' };
    default:
      return { icon: <OutlinedQuestionCircleIcon /> };
  }
};

type ApiKeyStatusLabelProps = {
  status: APIKeyDisplayStatus;
  showInactivePopover?: boolean;
  'data-testid'?: string;
};

const ApiKeyStatusLabel: React.FC<ApiKeyStatusLabelProps> = ({
  status,
  showInactivePopover = false,
  'data-testid': dataTestId,
}) => {
  const { variant, ...labelProps } = getApiKeyStatusProps(status);
  const label = (
    <Label variant={variant ?? 'outline'} {...labelProps} data-testid={dataTestId}>
      {capitalize(status)}
    </Label>
  );

  if (showInactivePopover && status === 'inactive') {
    return (
      <Popover
        headerContent="Subscription unavailable"
        bodyContent="The subscription this key was created for has been deleted or is not ready. The key itself has not been revoked, but it cannot authenticate requests until the subscription is restored."
      >
        <span style={{ cursor: 'pointer' }}>{label}</span>
      </Popover>
    );
  }

  return label;
};

export default ApiKeyStatusLabel;
