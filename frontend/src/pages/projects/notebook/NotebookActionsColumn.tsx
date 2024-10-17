import * as React from 'react';
import { ActionsColumn } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { NotebookKind, ProjectKind } from '~/k8sTypes';
import { NotebookState } from '~/pages/projects/notebook/types';

type Props = {
  project: ProjectKind;
  notebookState: NotebookState;
  onNotebookDelete: (notebook: NotebookKind) => void;
};

export const NotebookActionsColumn: React.FC<Props> = ({
  project,
  notebookState,
  onNotebookDelete,
}) => {
  const navigate = useNavigate();
  const { isStarting, isStopping } = notebookState;

  return (
    <ActionsColumn
      items={[
        {
          isDisabled: isStarting || isStopping,
          title: 'Edit workbench',
          onClick: () => {
            navigate(
              `/projects/${project.metadata.name}/spawner/${notebookState.notebook.metadata.name}`,
            );
          },
        },
        {
          title: 'Delete workbench',
          onClick: () => {
            onNotebookDelete(notebookState.notebook);
          },
        },
      ]}
    />
  );
};
