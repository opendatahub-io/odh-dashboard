import React from 'react';
import { ProductContextProvider } from '@odh-dashboard/autox-core/ui/context';
import { normalizePipelineRun } from '~/app/utilities/pipelineRunUtils';
import { isRunInTerminalState, parseErrorStatus } from '~/app/utilities/utils';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

export const ProductProvider: React.FC<React.PropsWithChildren> = ({ children }) => (
  <ProductContextProvider
    product="autorag"
    apiPrefix={URL_PREFIX}
    bffApiVersion={BFF_API_VERSION}
    isRunInTerminalState={isRunInTerminalState}
    parseErrorStatus={parseErrorStatus}
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    normalize={(run) => normalizePipelineRun(run as Parameters<typeof normalizePipelineRun>[0])}
  >
    {children}
  </ProductContextProvider>
);
