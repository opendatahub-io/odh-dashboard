import type { Extension } from '@openshift/dynamic-plugin-sdk';

declare const pluginExtensions: Record<string, Extension[]>;
export default pluginExtensions;
export declare const featureFlags: Record<string, boolean>;
