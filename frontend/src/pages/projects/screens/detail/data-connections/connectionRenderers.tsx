import * as React from 'react';
import { DataConnectionType } from '../../../types';
import { CubeIcon } from '@patternfly/react-icons';

export const DATA_CONNECTION_TYPES: { [key in DataConnectionType]: React.ReactNode } = {
  [DataConnectionType.AWS]: (
    <>
      <CubeIcon /> Object storage
    </>
  ),
};
