import type { AreaExtension } from '@odh-dashboard/plugin-core/extension-points';
// eslint-disable-next-line no-restricted-syntax -- static entry exports the shared runtime area extension
import observabilityArea from './area';

const extensions: AreaExtension[] = [observabilityArea];

export default extensions;
