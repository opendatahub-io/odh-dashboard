import * as React from 'react';
import { Button, Spinner, Text, TextVariants, Timestamp } from '@patternfly/react-core';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { ProjectKind } from '~/k8sTypes';
import useProjectTableRowItems from '~/pages/projects/screens/projects/useProjectTableRowItems';
import ResourceNameTooltip from '~/components/ResourceNameTooltip';
import { getProjectOwner } from '~/concepts/projects/utils';
import useProjectNotebookStates from '~/pages/projects/notebook/useProjectNotebookStates';
import NotebookRouteLink from '~/pages/projects/notebook/NotebookRouteLink';
import CanEnableElyraPipelinesCheck from '~/concepts/pipelines/elyra/CanEnableElyraPipelinesCheck';
import NotebookStateStatus from '~/pages/projects/screens/projects/NotebookStateStatus';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
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
  const navigate = useNavigate();
  const owner = getProjectOwner(project);

  const [item, runAccessCheck] = useProjectTableRowItems(
    project,
    isRefreshing,
    setEditData,
    setDeleteData,
  );
  const [notebookStates, loaded] = useProjectNotebookStates(project.metadata.name);

  return (
    <CanEnableElyraPipelinesCheck namespace={project.metadata.name}>
      {(enablePipelines) => (
        <>
          {(notebookStates.length ? notebookStates : [null]).map((notebookState, index) => (
            <Tr
              key={notebookState?.notebook.metadata.uid ?? 'empty'}
              {...(index % 2 !== 0 && { isStriped: true })}
            >
              {index === 0 ? (
                <Td dataLabel="Name" rowSpan={notebookStates.length || 1}>
                  <ResourceNameTooltip resource={project}>
                    <ProjectLink project={project} />
                  </ResourceNameTooltip>
                  {owner && <Text component={TextVariants.small}>{owner}</Text>}
                </Td>
              ) : null}
              {index === 0 ? (
                <Td dataLabel="Created" rowSpan={notebookStates.length || 1}>
                  {project.metadata.creationTimestamp ? (
                    <Timestamp date={new Date(project.metadata.creationTimestamp)} />
                  ) : (
                    'Unknown'
                  )}
                </Td>
              ) : null}
              {loaded ? (
                <>
                  {notebookState ? (
                    <Td
                      dataLabel="workbenchName"
                      style={{ paddingLeft: 'var(--pf-v5-global--spacer--sm)' }}
                    >
                      <NotebookRouteLink
                        label={getDisplayNameFromK8sResource(notebookState.notebook)}
                        notebook={notebookState.notebook}
                        isRunning={notebookState.isRunning}
                      />
                    </Td>
                  ) : (
                    <Td colSpan={2} style={{ fontSize: 'var(--pf-v5-global--FontSize--sm' }}>
                      <Button
                        variant="link"
                        isInline
                        onClick={() => navigate(`/projects/${project.metadata.name}/spawner`)}
                      >
                        Create a workbench
                      </Button>{' '}
                      to add a custom notebook.
                    </Td>
                  )}
                </>
              ) : (
                <Td colSpan={2}>
                  <Spinner size="sm" />
                </Td>
              )}
              {loaded && notebookState ? (
                <Td dataLabel="Status">
                  <NotebookStateStatus
                    notebookState={notebookState}
                    enablePipelines={enablePipelines}
                  />
                </Td>
              ) : null}
              {index === 0 ? (
                <Td
                  className="odh-project-table__action-column"
                  isActionCell
                  rowSpan={notebookStates.length || 1}
                  onMouseEnter={runAccessCheck}
                  onClick={runAccessCheck}
                >
                  <ActionsColumn items={item} />
                </Td>
              ) : null}
            </Tr>
          ))}
        </>
      )}
    </CanEnableElyraPipelinesCheck>
  );
};

export default ProjectTableRow;
