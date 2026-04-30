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
    case NIMAccountStatus.CONFIGURING:
      return (
        <Alert
          variant="info"
          isInline
          title="API key validated. Configuring NIM resources."
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
    case NIMAccountStatus.READY:
      return <Alert variant="success" isInline title="NVIDIA NIM is enabled." />;
    default:
      return null;
  }
};

export default NIMAccountStatusAlerts;
