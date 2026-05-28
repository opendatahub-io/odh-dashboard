import * as React from 'react';
import { Badge, Flex, FlexItem, Label } from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { useNamespaceSelector } from 'mod-arch-core';
import AiExperienceIcon from '@odh-dashboard/internal/images/icons/AiExperienceIcon';
import ProjectSelector from '@odh-dashboard/internal/concepts/projects/ProjectSelector';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';

type PipelineCoreProjectSelectorProps = {
  namespace?: string;
  getRedirectPath: (namespace: string) => string;
} & Omit<
  React.ComponentProps<typeof ProjectSelector>,
  'onSelection' | 'namespace' | 'toggleContent'
>;

const GenAiCoreProjectSelector: React.FC<PipelineCoreProjectSelectorProps> = ({
  getRedirectPath,
  namespace,
  ...projectSelectorProps
}) => {
  const navigate = useNavigate();
  const { namespaces, updatePreferredNamespace, namespacesLoaded } = useNamespaceSelector();

  const toggleContent = (
    <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>
        <FilterIcon />
      </FlexItem>
      <FlexItem>A.I. projects</FlexItem>
      <FlexItem>
        <Badge isRead>{namespaces.length}</Badge>
      </FlexItem>
      <FlexItem>
        <Label
          icon={<AiExperienceIcon />}
          variant="outline"
          data-testid="ai-project-label"
          isCompact
        >
          AI
        </Label>
      </FlexItem>
    </Flex>
  );

  return (
    <ProjectSelector
      {...projectSelectorProps}
      onSelection={(projectName) => {
        const match = projectName
          ? (namespaces.find((n) => n.name === projectName) ?? undefined)
          : undefined;
        fireMiscTrackingEvent('GenAI Project Dropdown Option Selected', {
          selectedProject: projectName,
        });
        updatePreferredNamespace(match);
        navigate(getRedirectPath(projectName));
      }}
      namespace={namespace ?? ''}
      isLoading={!namespacesLoaded}
      namespacesOverride={namespaces}
      toggleContent={namespacesLoaded ? toggleContent : undefined}
    />
  );
};

export default GenAiCoreProjectSelector;
