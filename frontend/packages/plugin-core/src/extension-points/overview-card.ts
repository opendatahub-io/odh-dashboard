import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from './types';

export type OverviewCardTab = Extension<
  'app.project-details/overview-section',
  {
    id: string;
    title: string;
    component: ComponentCodeRef;
  }
>;
export const isOverviewCardTab = (extension: Extension): extension is OverviewCardTab =>
  extension.type === 'app.project-details/overview-section';
