import { DashboardConfig, NotebookToleration, NotebookTolerationSettings } from '../types';
import { NotebookKind } from '../k8sTypes';

export type TolerationChanges = {
  type: 'add' | 'remove' | 'replace' | 'nothing';
  settings: NotebookToleration[];
};

export const determineTolerations = (
  hasGpu: boolean,
  tolerationSettings?: NotebookTolerationSettings,
): NotebookToleration[] => {
  const tolerations: NotebookToleration[] = [];

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
