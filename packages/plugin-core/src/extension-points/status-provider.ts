import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';

export type StatusReport = { status: 'info' | 'warning' | 'error'; message: string };

export type StatusProviderHook = () => StatusReport | undefined;

/**
 * Provides a status report which can be referenced by various components.
 */
export type StatusProviderExtension = Extension<
  'app.status-provider',
  {
    /** The status provider ID. */
    id: string;
    /** The status provider hook. */
    statusProviderHook: CodeRef<StatusProviderHook>;
  }
>;

// Type guards

export const isStatusProviderExtension = (e: Extension): e is StatusProviderExtension =>
  e.type === 'app.status-provider';
