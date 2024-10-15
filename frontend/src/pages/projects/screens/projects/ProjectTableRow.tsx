import * as React from 'react';
import { Spinner, Content, ContentVariants, Timestamp } from '@patternfly/react-core';
import { ActionsColumn, Tbody, Td, Tr } from '@patternfly/react-table';
import { ProjectKind } from '~/k8sTypes';
import NotebookIcon from '~/images/icons/NotebookIcon';
import useProjectTableRowItems from '~/pages/projects/screens/projects/useProjectTableRowItems';
import { getProjectOwner } from '~/concepts/projects/utils';
import ProjectTableRowNotebookTable from '~/pages/projects/screens/projects/ProjectTableRowNotebookTable';
import { TableRowTitleDescription } from '~/components/table';
import ResourceNameTooltip from '~/components/ResourceNameTooltip';
import { getDescriptionFromK8sResource } from '~/concepts/k8s/utils';
import { useWatchNotebooks } from '~/utilities/useWatchNotebooks';
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
  const [notebooks, loaded] = useWatchNotebooks(project.metadata.name);

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
                    fontSize: 'var(--pf-t--global--font--size--md)',
                    fontWeight: 'var(--pf-t--global--font--weight--body--default)',
                  }}
                />
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
            <NotebookIcon className="pf-v6-u-mr-xs" />
            {loaded ? notebooks.length : <Spinner size="sm" />}
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
              borderTopColor:
                'var(--pf-t--temp--dev--tbd)' /* CODEMODS: original v5 color was --pf-v5-global--BorderColor--100 */,
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
