import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { NotebookKind, ProjectKind } from '~/k8sTypes';
import NotebookRouteLink from '~/pages/projects/notebook/NotebookRouteLink';
import NotebookStateStatus from '~/pages/projects/notebook/NotebookStateStatus';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { NotebookState } from '~/pages/projects/notebook/types';
import { useNotebookActionsColumn } from '~/pages/projects/notebook/NotebookActionsColumn';

type ProjectTableRowNotebookTableRowProps = {
  project: ProjectKind;
  obj: NotebookState;
  onNotebookDelete: (notebook: NotebookKind) => void;
  enablePipelines: boolean;
};
const ProjectTableRowNotebookTableRow: React.FC<ProjectTableRowNotebookTableRowProps> = ({
  project,
  obj: notebookState,
  onNotebookDelete,
  enablePipelines,
}) => {
  const [ActionColumn, stopNotebook] = useNotebookActionsColumn(
    project,
    notebookState,
    enablePipelines,
    onNotebookDelete,
  );
  return (
    <Tr style={{ border: 'none' }} data-testid="project-notebooks-table-row">
      <Td dataLabel="Name">
        <NotebookRouteLink
          label={getDisplayNameFromK8sResource(notebookState.notebook)}
          notebook={notebookState.notebook}
          isRunning={notebookState.isRunning}
        />
      </Td>
      <Td dataLabel="Status">
        <NotebookStateStatus notebookState={notebookState} stopNotebook={stopNotebook} />
      </Td>
      <Td isActionCell>{ActionColumn}</Td>
    </Tr>
  );
};

export default ProjectTableRowNotebookTableRow;
