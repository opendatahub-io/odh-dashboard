import type { Extension } from '@openshift/dynamic-plugin-sdk';

export const SUPPRESS_EXTENSION_TYPE = 'app.suppress';

export type SuppressExtension = Extension<
  typeof SUPPRESS_EXTENSION_TYPE,
  {
    targetType: string;
    targetId: string;
  }
>;

export const isSuppressExtension = (e: Extension): e is SuppressExtension =>
  e.type === SUPPRESS_EXTENSION_TYPE;
