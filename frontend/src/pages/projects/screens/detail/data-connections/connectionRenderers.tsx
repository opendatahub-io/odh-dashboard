import * as React from 'react';
import { CubeIcon } from '@patternfly/react-icons';
import { DataConnectionType } from '~/pages/projects/types';

export const DATA_CONNECTION_TYPES: { [key in DataConnectionType]: React.ReactNode } = {
  [DataConnectionType.AWS]: (
    <>
      <CubeIcon /> Object storage
    </>
  ),
  [DataConnectionType.UNKNOWN]: undefined,
};
