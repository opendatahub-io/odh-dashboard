import * as React from 'react';
import { ExtensibilityContextProvider as PluginCoreExtensibilityContextProvider } from '@odh-dashboard/plugin-core/extensibility';
import { MF_REMOTES } from '#~/utilities/const';
import pluginExtensions from './plugin-extensions';

export const ExtensibilityContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => (
  <PluginCoreExtensibilityContextProvider
    staticExtensions={pluginExtensions}
    mfRemotes={MF_REMOTES}
  >
    {children}
  </PluginCoreExtensibilityContextProvider>
);
