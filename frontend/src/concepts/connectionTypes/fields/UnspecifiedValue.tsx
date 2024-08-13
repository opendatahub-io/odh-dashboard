import * as React from 'react';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

const UnspecifiedValue: React.FC = () => (
  <>
    Unspecified{' '}
    <ExclamationCircleIcon
      color="var(--pf-v5-global--danger-color--100)"
      aria-label="unspecified"
    />
  </>
);

export default UnspecifiedValue;
