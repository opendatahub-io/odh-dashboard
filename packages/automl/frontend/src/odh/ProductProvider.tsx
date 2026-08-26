import React from 'react';
import { ProductContextProvider } from '@odh-dashboard/autox-core/ui/context';
import { isRunInTerminalState, parseErrorStatus } from '~/app/utilities/utils';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

export const ProductProvider: React.FC<React.PropsWithChildren> = ({ children }) => (
  <ProductContextProvider
    product="automl"
    apiPrefix={URL_PREFIX}
    bffApiVersion={BFF_API_VERSION}
    isRunInTerminalState={isRunInTerminalState}
    parseErrorStatus={parseErrorStatus}
  >
    {children}
  </ProductContextProvider>
);
