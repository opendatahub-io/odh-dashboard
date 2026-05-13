import type {
  AreaExtension,
  HrefNavItemExtension,
  RouteExtension,
  TaskItemExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
// eslint-disable-next-line no-restricted-syntax
import {
  globPromptManagementAll,
  promptManagementPath,
} from '@odh-dashboard/internal/routes/pipelines/mlflow';
// eslint-disable-next-line no-restricted-syntax
import { PROMPT_MANAGEMENT_PAGE_TITLE } from './shared/const';

/**
 * MLflow host-side extensions.
 */
const extensions: (AreaExtension | HrefNavItemExtension | RouteExtension | TaskItemExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: 'mlflow-embedded',
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [SupportedArea.MLFLOW],
    },
    properties: {
      id: 'experiments-mlflow',
      title: 'Experiments',
      href: '/develop-train/mlflow/experiments',
      section: 'develop-and-train',
      path: '/develop-train/mlflow/experiments/*',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.MLFLOW],
    },
    properties: {
      path: '/develop-train/mlflow/*',
      component: () => import('./experiments/GlobalMLflowExperimentsRoutes'),
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: ['plugin-gen-ai', SupportedArea.MLFLOW],
    },
    properties: {
      id: 'prompt-management',
      title: PROMPT_MANAGEMENT_PAGE_TITLE,
      href: promptManagementPath,
      section: 'gen-ai-studio',
      path: globPromptManagementAll,
      group: '6_prompt_management',
    },
  },
  {
    type: 'app.route',
    flags: {
      required: [SupportedArea.MLFLOW],
    },
    properties: {
      path: globPromptManagementAll,
      component: () => import('./prompts/GlobalMLflowPromptManagementRoutes'),
    },
  },
  {
    type: 'app.task/item',
    flags: {
      required: [SupportedArea.MLFLOW],
    },
    properties: {
      id: 'develop-experiments',
      group: 'develop-and-train',
      title: 'Track and compare training runs',
      destination: { href: '/develop-train/mlflow/experiments' },
      order: '3_experiments',
    },
  },
  {
    type: 'app.task/item',
    flags: {
      required: ['plugin-gen-ai', SupportedArea.MLFLOW],
    },
    properties: {
      id: 'genai-prompts',
      group: 'gen-ai-studio',
      title: 'Create and manage AI prompts',
      destination: { href: promptManagementPath },
      order: '4_prompts',
    },
  },
];

export default extensions;
