import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import {
  useResolvedExtensions,
  useExtensions,
  type UseResolvedExtensionsResult,
} from '@odh-dashboard/plugin-core';
import type { Extension, LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import { ModelServingPlatform } from '../concepts/useProjectServingPlatform';

export const mockModelServingPlatform = ({
  id = 'kserve',
  namespaceApplicationCase = NamespaceApplicationCase.KSERVE_PROMOTION,
  enabledProjectMetadata = {
    labels: {
      'enable-modelmesh': 'false',
    },
  },
  title = 'KServe',
  description = 'KServe',
  selectText = 'Select',
  enabledText = 'Enabled',
  startHintTitle = 'KServe',
  startHintDescription = 'KServe',
  deployButtonText = 'Deploy',
}: {
  id?: string;
  namespaceApplicationCase?: NamespaceApplicationCase;
  enabledProjectMetadata?: {
    labels?: {
      [key: string]: string;
    };
    annotations?: {
      [key: string]: string;
    };
  };
  title?: string;
  description?: string;
  selectText?: string;
  enabledText?: string;
  startHintTitle?: string;
  startHintDescription?: string;
  deployButtonText?: string;
}): ModelServingPlatform => ({
  type: 'model-serving.platform',
  properties: {
    id,
    manage: {
      namespaceApplicationCase,
      enabledProjectMetadata,
    },
    enableCardText: {
      title,
      description,
      selectText,
      enabledText,
      objectType: ProjectObjectType.singleModel,
    },
    deployedModelsView: {
      startHintTitle,
      startHintDescription,
      deployButtonText,
    },
  },
});

export const mockProjectWithPlatform = (
  project: ProjectKind,
  platform: ModelServingPlatform,
): ProjectKind => {
  const projectWithPlatform = {
    ...project,
    metadata: {
      ...project.metadata,
      labels: {
        ...project.metadata.labels,
        ...platform.properties.manage.enabledProjectMetadata.labels,
      },
      annotations: {
        ...project.metadata.annotations,
        ...platform.properties.manage.enabledProjectMetadata.annotations,
      },
    },
  };
  return projectWithPlatform;
};
/**
 * @example
 * ```ts
 * jest.mock('@odh-dashboard/plugin-core');
 *
 * describe('My test', () => {
 *   beforeEach(() => {
 *     const { mockUseExtensions, mockUseResolvedExtensions } = mockExtensions([mocks]);
 *   });
 * ...
 * ```
 */
export const mockExtensions = (
  extensions: LoadedExtension<Extension>[] = [],
): {
  mockUseExtensions: jest.Mock;
  mockUseResolvedExtensions: jest.Mock;
} => {
  const mockUseResolvedExtensions = jest.mocked(useResolvedExtensions);
  const mockUseExtensions = jest.mocked(useExtensions);

  mockUseExtensions.mockReturnValue(extensions);
  mockUseResolvedExtensions.mockReturnValue([
    extensions as UseResolvedExtensionsResult<Extension>['0'],
    true,
    [],
  ]);

  return { mockUseResolvedExtensions, mockUseExtensions };
};
