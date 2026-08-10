import type { Extension } from '@openshift/dynamic-plugin-sdk';
import legacyUiExtensions from './legacy-ui';
import projectKeyExtensions from './project-key';
import wizardExtensions from './wizard';
import nimServiceExtensions from './nim-service';

const extensions: Extension[] = [
  ...legacyUiExtensions,
  ...projectKeyExtensions,
  ...wizardExtensions,
  ...nimServiceExtensions,
];

export default extensions;
