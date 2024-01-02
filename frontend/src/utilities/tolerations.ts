import { Patch } from '@openshift/dynamic-plugin-sdk-utils';
import _ from 'lodash';
import { PodToleration, TolerationSettings } from '~/types';
import { DashboardConfigKind, NotebookKind } from '~/k8sTypes';
import { AcceleratorState } from './useAcceleratorState';

export type TolerationChanges = {
  type: 'add' | 'remove' | 'replace' | 'nothing';
  settings: PodToleration[];
};

export const determineTolerations = (
  tolerationSettings?: TolerationSettings,
  acceleratorState?: AcceleratorState,
  existingTolerations?: PodToleration[],
): PodToleration[] => {
  let tolerations = existingTolerations || [];

  // remove old accelerator tolerations if they exist
  if (acceleratorState?.initialAccelerator) {
    tolerations = tolerations.filter(
      (t) => !acceleratorState.initialAccelerator?.spec.tolerations?.some((t2) => _.isEqual(t2, t)),
    );
  }

  // add new accelerator tolerations if they exist
  if (acceleratorState?.accelerator?.spec.tolerations) {
    tolerations.push(...acceleratorState.accelerator.spec.tolerations);
  }

  // remove duplicated tolerations
  tolerations = _.uniqWith(tolerations, _.isEqual);

  // add toleration from settings if they exist
  if (
    tolerationSettings?.enabled &&
    !tolerations.some(
      (t) =>
        t.key === tolerationSettings.key && t.operator === 'Exists' && t.effect === 'NoSchedule',
    )
  ) {
    tolerations.push({
      effect: 'NoSchedule',
      key: tolerationSettings.key,
      operator: 'Exists',
    });
  }

  return tolerations;
};

export const computeNotebooksTolerations = (
  dashboardConfig: DashboardConfigKind,
  notebook: NotebookKind,
): TolerationChanges => {
  const tolerations = notebook.spec.template.spec.tolerations || [];

  const settings = determineTolerations(
    dashboardConfig.spec.notebookController?.notebookTolerationSettings,
    undefined,
    tolerations,
  );

  const hasTolerations = !!tolerations && tolerations.length > 0;
  const doNothing = settings.length === 0 && !hasTolerations;
  const tolerationsRemoved = settings.length === 0 && hasTolerations;
  const updateTolerations = settings.length > 0 && hasTolerations;

  let type: TolerationChanges['type'];
  if (tolerationsRemoved) {
    type = 'remove';
  } else if (updateTolerations) {
    type = 'replace';
  } else if (doNothing) {
    type = 'nothing';
  } else {
    type = 'add';
  }

  return {
    type,
    settings,
  };
};

export const getTolerationPatch = (tolerationChanges: TolerationChanges): Patch | null => {
  const tolerationPath = '/spec/template/spec/tolerations';
  switch (tolerationChanges.type) {
    case 'remove':
      return {
        op: tolerationChanges.type,
        path: tolerationPath,
      };
    case 'replace':
    case 'add':
      return {
        op: tolerationChanges.type,
        path: tolerationPath,
        value: tolerationChanges.settings,
      };
    case 'nothing':
    default:
      return null;
  }
};
