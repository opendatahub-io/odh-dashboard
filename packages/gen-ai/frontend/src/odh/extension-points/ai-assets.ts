import type { ComponentType } from 'react';
import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';

export type AIAssetsTabExtension = Extension<
  'gen-ai.ai-assets/tab',
  {
    id: string;
    title: string;
    component: CodeRef<ComponentType<{ children?: React.ReactNode }>>;
    label?: string; // Optional label like "Tech Preview"
  }
>;

export const isAIAssetsTabExtension = (extension: Extension): extension is AIAssetsTabExtension =>
  extension.type === 'gen-ai.ai-assets/tab';
