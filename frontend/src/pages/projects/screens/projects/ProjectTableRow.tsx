import * as React from 'react';
import { Text, TextVariants, Timestamp } from '@patternfly/react-core';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { ProjectKind } from '~/k8sTypes';
import useProjectNotebookStates from '~/pages/projects/notebook/useProjectNotebookStates';
import ListNotebookState from '~/pages/projects/notebook/ListNotebookState';
import ResourceNameTooltip from '~/pages/projects/components/ResourceNameTooltip';
import { getProjectOwner } from '~/pages/projects/utils';
import ProjectLink from './ProjectLink';

type ProjectTableRowProps = {
  obj: ProjectKind;
  isRefreshing: boolean;
  setEditData: (data: ProjectKind) => void;
  setDeleteData: (data: ProjectKind) => void;
};

const ProjectTableRow: React.FC<ProjectTableRowProps> = ({
  obj: project,
  isRefreshing,
  setEditData,
  setDeleteData,
}) => {
  const [notebookStates, loaded, error] = useProjectNotebookStates(project.metadata.name);
  const owner = getProjectOwner(project);

  return (
    <Tr>
      <Td dataLabel="Name">
        <ResourceNameTooltip resource={project}>
          <ProjectLink project={project} />
        </ResourceNameTooltip>
        {owner && <Text component={TextVariants.small}>{owner}</Text>}
      </Td>
      <Td dataLabel="Workbench">
        <ListNotebookState
          notebookStates={notebookStates}
          loaded={loaded}
          error={error}
          show="notebook"
        />
      </Td>
      <Td dataLabel="Status">
        <ListNotebookState
          notebookStates={notebookStates}
          loaded={loaded}
          error={error}
          show="status"
        />
      </Td>
      <Td dataLabel="Created">
        {project.metadata.creationTimestamp ? (
          <Timestamp date={new Date(project.metadata.creationTimestamp)} />
        ) : (
          'Unknown'
        )}
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Edit project',
              isDisabled: isRefreshing,
              onClick: () => {
                setEditData(project);
              },
            },
            {
              title: 'Delete project',
              onClick: () => {
                setDeleteData(project);
              },
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default ProjectTableRow;
