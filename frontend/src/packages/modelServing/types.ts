import type { AnyObject, Extension } from '@openshift/dynamic-plugin-sdk';
import { ProjectKind } from '~/k8sTypes';

export type ModelServingExtension<
  Name extends string,
  Properties extends object = AnyObject,
> = Extension<
  `model-serving.${Name}`,
  {
    /** Pseudo-type; Identifying value for the serving type (used in other extensions) */
    servingId: string;
  } & Properties
>;

export type DeterminePlatformFromProject = (project: ProjectKind) => boolean;
