import { Patch } from '@openshift/dynamic-plugin-sdk-utils';
import { DashboardConfig, PodToleration, TolerationSettings } from '~/types';
import { NotebookKind } from '~/k8sTypes';

export type TolerationChanges = {
  type: 'add' | 'remove' | 'replace' | 'nothing';
  settings: PodToleration[];
};

export const determineTolerations = (
  hasGpu: boolean,
  tolerationSettings?: TolerationSettings,
): PodToleration[] => {
  const tolerations: PodToleration[] = [];

  if (hasGpu) {
    tolerations.push({
      effect: 'NoSchedule',
      key: 'nvidia.com/gpu',
      operator: 'Exists',
    });
  }
  if (tolerationSettings?.enabled) {
    tolerations.push({
      effect: 'NoSchedule',
      key: tolerationSettings.key,
      operator: 'Exists',
    });
  }

  return tolerations;
};

export const computeNotebooksTolerations = (
  dashboardConfig: DashboardConfig,
  notebook: NotebookKind,
): TolerationChanges => {
  const hasGPU = !!notebook.spec.template.spec.containers.find(
    (container) =>
      !!container.resources?.limits?.['nvidia.com/gpu'] ||
      !!container.resources?.requests?.['nvidia.com/gpu'],
  );
  const tolerations = notebook.spec.template.spec.tolerations || [];

  const settings = determineTolerations(
    hasGPU,
    dashboardConfig.spec.notebookController?.notebookTolerationSettings,
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
