import type { ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import type {
  TaskGroupExtension,
  TaskItemExtension,
} from '@odh-dashboard/plugin-core/extension-points';

export type ResolvedTaskGroupExtension = ResolvedExtension<TaskGroupExtension>;
export type ResolvedTaskGroup = ResolvedTaskGroupExtension['properties'];

export type ResolvedTaskItemExtension = ResolvedExtension<TaskItemExtension> & {
  properties: ResolvedExtension<TaskItemExtension>['properties'] & { href: string };
};
export type ResolvedTaskItem = ResolvedTaskItemExtension['properties'];
