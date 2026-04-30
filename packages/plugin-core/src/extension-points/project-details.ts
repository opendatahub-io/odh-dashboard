import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '../core/types';

export type ProjectDetailsTab = Extension<
  'app.project-details/tab',
  {
    id: string;
    title: string;
    component: ComponentCodeRef;
    // weight: num;
  }
>;
export const isProjectDetailsTab = (extension: Extension): extension is ProjectDetailsTab =>
  extension.type === 'app.project-details/tab';

export type ProjectDetailsSettingsCard = Extension<
  'app.project-details/settings-card',
  {
    id: string;
    title: string;
    component: ComponentCodeRef;
  }
>;
export const isProjectDetailsSettingsCard = (
  extension: Extension,
): extension is ProjectDetailsSettingsCard =>
  extension.type === 'app.project-details/settings-card';
