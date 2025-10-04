import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import {
  useResolvedExtensions,
  useExtensions,
  type UseResolvedExtensionsResult,
} from '@odh-dashboard/plugin-core';
import * as _ from 'lodash-es';
import type { Extension, LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import { mockK8sNameDescriptionFieldData } from '@odh-dashboard/internal/__mocks__/mockK8sNameDescriptionFieldData';
import { RecursivePartial } from '@odh-dashboard/internal/typeHelpers';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { ModelServingPlatform } from '../concepts/useProjectServingPlatform';
import type { UseModelDeploymentWizardState } from '../components/deploymentWizard/useDeploymentWizard';

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
      projectRequirements: enabledProjectMetadata,
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
        ...platform.properties.manage.projectRequirements.labels,
      },
      annotations: {
        ...project.metadata.annotations,
        ...platform.properties.manage.projectRequirements.annotations,
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

export const mockDeploymentWizardState = (
  overrides: RecursivePartial<UseModelDeploymentWizardState> = {},
): UseModelDeploymentWizardState =>
  _.merge(
    {
      initialData: undefined,
      state: {
        modelType: {
          data: ServingRuntimeModelType.GENERATIVE,
          setData: jest.fn(),
        },
        modelLocationData: {
          data: undefined,
          setData: jest.fn(),
          connections: [],
          setSelectedConnection: jest.fn(),
          selectedConnection: undefined,
          isLoadingSecretData: true,
          project: null,
          connectionsLoaded: true,
          connectionTypes: [],
          connectionTypesLoaded: true,
        },
        k8sNameDesc: {
          data: mockK8sNameDescriptionFieldData(),
          onDataChange: jest.fn(),
        },
        hardwareProfileConfig: {
          formData: {
            selectedProfile: undefined,
            useExistingSettings: false,
            resources: undefined,
          },
          initialHardwareProfile: undefined,
          isFormDataValid: true,
          setFormData: jest.fn(),
          resetFormData: jest.fn(),
          profilesLoaded: true,
          profilesLoadError: undefined,
        },
        modelFormatState: {
          modelFormatOptions: [],
          modelFormat: undefined,
          setModelFormat: jest.fn(),
          isVisible: false,
          error: undefined,
          loaded: true,
          templatesFilteredForModelType: [],
        },
        externalRoute: {
          data: undefined,
          setData: jest.fn(),
          updateField: jest.fn(),
        },
        tokenAuthentication: {
          data: undefined,
          setData: jest.fn(),
          updateField: jest.fn(),
        },
        runtimeArgs: {
          data: undefined,
          setData: jest.fn(),
        },
        environmentVariables: {
          data: undefined,
          setData: jest.fn(),
        },
        numReplicas: {
          data: undefined,
          setReplicas: jest.fn(),
        },
        AiAssetData: {
          data: {
            saveAsAiAsset: false,
            useCase: '',
          },
          setData: jest.fn(),
        },
        modelServer: {
          data: undefined,
          setData: jest.fn(),
          options: [],
        },
      },
    },
    overrides,
  );
