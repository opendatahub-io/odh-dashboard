import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';

export type StatusReport = { status: 'info' | 'warning' | 'error'; message: string };

export type StatusProviderHook = () => StatusReport | undefined;

export type StatusProviderExtension = Extension<
  'app.status-provider',
  {
    id: string;
    statusProviderHook: CodeRef<StatusProviderHook>;
  }
>;

// Type guards

export const isStatusProviderExtension = (e: Extension): e is StatusProviderExtension =>
  e.type === 'app.status-provider';
