import { NamespaceApplicationCase } from '@odh-dashboard/internal/pages/projects/types';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import { ModelServingPlatform } from '../concepts/useProjectServingPlatform';

export const mockModelServingPlatform = ({
  id = 'kserve',
  namespaceApplicationCase = NamespaceApplicationCase.KSERVE_PROMOTION,
  enabledLabel = 'kserve',
  enabledLabelValue = 'true',
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
  enabledLabel?: string;
  enabledLabelValue?: string;
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
      enabledLabel,
      enabledLabelValue,
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
        [platform.properties.manage.enabledLabel]: platform.properties.manage.enabledLabelValue,
      },
    },
  };
  return projectWithPlatform;
};
