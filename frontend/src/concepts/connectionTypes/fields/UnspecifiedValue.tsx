import * as React from 'react';
import { ExclamationCircleIcon } from '@patternfly/react-icons';

const UnspecifiedValue: React.FC = () => (
  <>
    Unspecified{' '}
    <ExclamationCircleIcon color="var(--pf-t--global--icon--color--status--danger--default)" />
  </>
);

export default UnspecifiedValue;
