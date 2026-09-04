import type { Extension } from '@openshift/dynamic-plugin-sdk';
import legacyUiExtensions from './legacy-ui';
import projectKeyExtensions from './project-key';
import wizardExtensions from './wizard';
import nimKServeExtensions from './nim-kserve';
import nimServiceExtensions from './nim-service';
import clusterStorageExtensions from './cluster-storage';

const extensions: Extension[] = [
  ...legacyUiExtensions,
  ...projectKeyExtensions,
  ...wizardExtensions,
  ...nimKServeExtensions,
  ...nimServiceExtensions,
  ...clusterStorageExtensions,
];

export default extensions;
