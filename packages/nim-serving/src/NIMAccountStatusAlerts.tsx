import React from 'react';
import { Alert, Spinner } from '@patternfly/react-core';
import { NIMAccountStatus } from './useNIMAccountStatus';

type NIMAccountStatusAlertsProps = {
  status: NIMAccountStatus;
  errorMessages: string[];
};

const NIMAccountStatusAlerts: React.FC<NIMAccountStatusAlertsProps> = ({
  status,
  errorMessages,
}) => {
  switch (status) {
    case NIMAccountStatus.PENDING:
      return (
        <Alert
          variant="info"
          isInline
          title="Contacting NVIDIA to validate the license key."
          customIcon={<Spinner size="md" />}
        >
          This can take a few minutes.
        </Alert>
      );
    case NIMAccountStatus.ERROR:
      return (
        <Alert variant="danger" isInline title="Validation failed">
          {errorMessages.length > 0 ? errorMessages.join('; ') : 'API key failed validation.'}
        </Alert>
      );
    default:
      return null;
  }
};

export default NIMAccountStatusAlerts;
