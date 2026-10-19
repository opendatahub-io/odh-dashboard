import React from 'react';
import { AutoXApiProvider } from '@odh-dashboard/autox-core/ui/context';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

export const ProductProvider: React.FC<React.PropsWithChildren> = ({ children }) => (
  <AutoXApiProvider apiPrefix={URL_PREFIX} bffApiVersion={BFF_API_VERSION}>
    {children}
  </AutoXApiProvider>
);
