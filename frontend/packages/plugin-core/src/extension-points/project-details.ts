import { Extension } from '@openshift/dynamic-plugin-sdk';
import { ComponentCodeRef } from './types';

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
