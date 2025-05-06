import type { AnyObject, CodeRef } from '@openshift/dynamic-plugin-sdk';

export type ComponentCodeRef<Props = AnyObject> = CodeRef<{ default: React.ComponentType<Props> }>;
