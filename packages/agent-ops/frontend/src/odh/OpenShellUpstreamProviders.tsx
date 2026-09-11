import * as React from 'react';
import { setApiBasePath } from 'openshell-dashboard/api';
import { AlertProvider } from 'openshell-dashboard/components';
import { SlotProvider } from 'openshell-dashboard/slots';
import { URL_PREFIX } from '~/app/utilities/const';

setApiBasePath(URL_PREFIX);

type OpenShellUpstreamProvidersProps = {
  children: React.ReactNode;
};

const OpenShellUpstreamProviders: React.FC<OpenShellUpstreamProvidersProps> = ({ children }) => (
  <AlertProvider>
    <SlotProvider slots={{}}>{children}</SlotProvider>
  </AlertProvider>
);

export default OpenShellUpstreamProviders;
