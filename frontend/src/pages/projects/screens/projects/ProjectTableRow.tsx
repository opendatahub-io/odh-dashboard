import * as React from 'react';
import { Content, ContentVariants, Timestamp, Flex, FlexItem } from '@patternfly/react-core';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { ProjectKind } from '#~/k8sTypes';
import useProjectTableRowItems from '#~/pages/projects/screens/projects/useProjectTableRowItems';
import { getProjectOwner, isAiProject } from '#~/concepts/projects/utils';
import { TableRowTitleDescription } from '#~/components/table';
import ResourceNameTooltip from '#~/components/ResourceNameTooltip';
import { getDescriptionFromK8sResource } from '#~/concepts/k8s/utils';
import { allProjectFilterKey } from '#~/pages/projects/screens/projects/const';
import ProjectLink from './ProjectLink';
import { AILabel } from './AILabel';

type ProjectTableRowProps = {
  obj: ProjectKind;
  isRefreshing: boolean;
  setEditData: (data: ProjectKind) => void;
  setDeleteData: (data: ProjectKind) => void;
  currentProjectFilterType?: string;
};
const ProjectTableRow: React.FC<ProjectTableRowProps> = ({
  obj: project,
  isRefreshing,
  setEditData,
  setDeleteData,
  currentProjectFilterType,
}) => {
  const owner = getProjectOwner(project);
  const [item, runAccessCheck] = useProjectTableRowItems(
    project,
    isRefreshing,
    setEditData,
    setDeleteData,
  );

  const thisIsAiProject = isAiProject(project);
  const shouldShowAiLabel = currentProjectFilterType === allProjectFilterKey && thisIsAiProject;

  return (
    <Tr isControlRow>
      <Td dataLabel="Name">
        <TableRowTitleDescription
          title={
            <ResourceNameTooltip resource={project}>
              <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <ProjectLink project={project} />
                </FlexItem>
                {shouldShowAiLabel && (
                  <FlexItem>
                    <AILabel />
                  </FlexItem>
                )}
              </Flex>
            </ResourceNameTooltip>
          }
          description={getDescriptionFromK8sResource(project)}
          truncateDescriptionLines={2}
          subtitle={
            owner ? (
              <div>
                <Content component={ContentVariants.small}>{owner}</Content>
              </div>
            ) : undefined
          }
        />
      </Td>
      <Td dataLabel="Created">
        {project.metadata.creationTimestamp ? (
          <Timestamp date={new Date(project.metadata.creationTimestamp)} />
        ) : (
          'Unknown'
        )}
      </Td>
      <Td
        className="odh-project-table__action-column"
        isActionCell
        onMouseEnter={runAccessCheck}
        onClick={runAccessCheck}
      >
        <ActionsColumn items={item} />
      </Td>
    </Tr>
  );
};

export default ProjectTableRow;
