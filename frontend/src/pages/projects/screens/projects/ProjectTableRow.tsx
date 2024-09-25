import * as React from 'react';
import { Text, TextVariants, Timestamp } from '@patternfly/react-core';
import { ActionsColumn, Tbody, Td, Tr } from '@patternfly/react-table';
import { NotebookKind, ProjectKind } from '~/k8sTypes';
import NotebookIcon from '~/images/icons/NotebookIcon';
import useProjectTableRowItems from '~/pages/projects/screens/projects/useProjectTableRowItems';
import { getProjectOwner } from '~/concepts/projects/utils';
import ProjectTableRowNotebookTable from '~/pages/projects/screens/projects/ProjectTableRowNotebookTable';
import { TableRowTitleDescription } from '~/components/table';
import ResourceNameTooltip from '~/components/ResourceNameTooltip';
import { getDescriptionFromK8sResource } from '~/concepts/k8s/utils';
import ProjectLink from './ProjectLink';

// Plans to add other expandable columns in the future
export enum ExpandableColumns {
  WORKBENCHES = 1,
}

type ProjectTableRowProps = {
  obj: ProjectKind;
  notebooks: NotebookKind[];
  isRefreshing: boolean;
  setEditData: (data: ProjectKind) => void;
  setDeleteData: (data: ProjectKind) => void;
};
const ProjectTableRow: React.FC<ProjectTableRowProps> = ({
  obj: project,
  notebooks,
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

  const toggleExpandColumn = (colIndex: ExpandableColumns) => {
    setExpandColumn(expandColumn === colIndex ? undefined : colIndex);
  };

  return (
    <Tbody isExpanded={!!expandColumn}>
      <Tr>
        <Td dataLabel="Name">
          <TableRowTitleDescription
            title={
              <ResourceNameTooltip resource={project}>
                <ProjectLink
                  project={project}
                  style={{
                    fontSize: 'var(--pf-v5-global--FontSize--md)',
                    fontWeight: 'var(--pf-v5-global--FontWeight--normal)',
                  }}
                />
              </ResourceNameTooltip>
            }
            description={getDescriptionFromK8sResource(project)}
            truncateDescriptionLines={2}
            subtitle={
              owner ? (
                <div>
                  <Text component={TextVariants.small}>{owner}</Text>
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
          dataLabel="Workbenches"
          compoundExpand={
            notebooks.length
              ? {
                  isExpanded: expandColumn === ExpandableColumns.WORKBENCHES,
                  columnIndex: ExpandableColumns.WORKBENCHES,
                  expandId: `expand-table-row-${project.metadata.name}-workbenches`,
                  onToggle: (_, __, column) => toggleExpandColumn(column),
                }
              : undefined
          }
          data-testid="notebook-column-expand"
        >
          <span>
            <NotebookIcon className="pf-v5-u-mr-xs" />
            {notebooks.length}
          </span>
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
      {expandColumn ? (
        <Tr isExpanded={!!expandColumn}>
          <Td
            colSpan={4}
            style={{
              borderTopWidth: 1,
              borderTopStyle: 'solid',
              borderTopColor: 'var(--pf-v5-global--BorderColor--100)',
            }}
          >
            <ProjectTableRowNotebookTable obj={project} notebooks={notebooks} />
          </Td>
        </Tr>
      ) : null}
    </Tbody>
  );
};

export default ProjectTableRow;
