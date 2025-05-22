import * as React from 'react';
import { Spinner, Content, ContentVariants, Timestamp } from '@patternfly/react-core';
import { ActionsColumn, Tbody, Td, Tr, ExpandableRowContent } from '@patternfly/react-table';
import { OffIcon, PlayIcon } from '@patternfly/react-icons';
import { ProjectKind } from '~/k8sTypes';
import useProjectTableRowItems from '~/pages/projects/screens/projects/useProjectTableRowItems';
import { getProjectOwner } from '~/concepts/projects/utils';
import ProjectTableRowNotebookTable from '~/pages/projects/screens/projects/ProjectTableRowNotebookTable';
import { TableRowTitleDescription } from '~/components/table';
import ResourceNameTooltip from '~/components/ResourceNameTooltip';
import { getDescriptionFromK8sResource } from '~/concepts/k8s/utils';
import useProjectNotebookStates from '~/pages/projects/notebook/useProjectNotebookStates';
import { FAST_POLL_INTERVAL, POLL_INTERVAL } from '~/utilities/const';
import useRefreshInterval from '~/utilities/useRefreshInterval';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import ProjectLink from './ProjectLink';

// Plans to add other expandable columns in the future
export enum ExpandableColumns {
  WORKBENCHES = 1,
}

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
  const owner = getProjectOwner(project);
  const [expandColumn, setExpandColumn] = React.useState<ExpandableColumns | undefined>();
  const [item, runAccessCheck] = useProjectTableRowItems(
    project,
    isRefreshing,
    setEditData,
    setDeleteData,
  );
  const { data: notebookStates, loaded, refresh } = useProjectNotebookStates(project.metadata.name);
  const runningCount = notebookStates.filter(
    (notebookState) => notebookState.isRunning || notebookState.isStarting,
  ).length;
  const stoppedCount = notebookStates.filter(
    (notebookState) => notebookState.isStopping || notebookState.isStopped,
  ).length;

  const toggleExpandColumn = (colIndex: ExpandableColumns) => {
    setExpandColumn(expandColumn === colIndex ? undefined : colIndex);
  };

  useRefreshInterval(FAST_POLL_INTERVAL, () =>
    notebookStates
      .filter((notebookState) => notebookState.isStarting || notebookState.isStopping)
      .forEach((notebookState) => notebookState.refresh()),
  );

  useRefreshInterval(POLL_INTERVAL, () =>
    notebookStates
      .filter((notebookState) => !notebookState.isStarting && !notebookState.isStopping)
      .forEach((notebookState) => notebookState.refresh()),
  );

  const workbenchEnabled = useIsAreaAvailable(SupportedArea.WORKBENCHES).status;

  return (
    <Tbody isExpanded={!!expandColumn}>
      <Tr isControlRow>
        <Td dataLabel="Name">
          <TableRowTitleDescription
            title={
              <ResourceNameTooltip resource={project}>
                <ProjectLink project={project} />
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
        {workbenchEnabled && (
          <Td
            dataLabel="Workbenches"
            compoundExpand={
              notebookStates.length
                ? {
                    isExpanded: expandColumn === ExpandableColumns.WORKBENCHES,
                    columnIndex: ExpandableColumns.WORKBENCHES,
                    rowIndex: 1,
                    expandId: `expand-table-row`,
                    onToggle: (_, __, column) => toggleExpandColumn(column),
                  }
                : undefined
            }
            data-testid="notebook-column-expand"
          >
            {!loaded ? (
              <Spinner size="sm" />
            ) : (
              <div data-testid="notebook-column-count">
                <PlayIcon className="pf-v6-u-mr-xs" />
                {runningCount}
                <OffIcon className="pf-v6-u-ml-sm pf-v6-u-mr-xs" />
                {stoppedCount}
              </div>
            )}
          </Td>
        )}
        <Td
          className="odh-project-table__action-column"
          isActionCell
          onMouseEnter={runAccessCheck}
          onClick={runAccessCheck}
        >
          <ActionsColumn items={item} />
        </Td>
      </Tr>
      {expandColumn ? (
        <Tr isExpanded={!!expandColumn}>
          <Td
            colSpan={4}
            style={{
              borderTopWidth: 1,
              borderTopStyle: 'solid',
              borderTopColor: 'var(--pf-t--global--border--color--default)',
            }}
          >
            <ExpandableRowContent>
              <ProjectTableRowNotebookTable
                obj={project}
                notebookStates={notebookStates}
                refresh={refresh}
              />
            </ExpandableRowContent>
          </Td>
        </Tr>
      ) : null}
    </Tbody>
  );
};

export default ProjectTableRow;
