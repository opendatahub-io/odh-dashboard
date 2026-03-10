import * as React from 'react';
import { ActionsColumn } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { NotebookKind, ProjectKind } from '#~/k8sTypes';
import { NotebookState } from '#~/pages/projects/notebook/types';

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

  return (
    <ActionsColumn
      id="notebook-actions"
      items={[
        {
          title: <span data-testid="edit-workbench-action">Edit workbench</span>,
          onClick: () => {
            navigate(
              `/projects/${project.metadata.name}/spawner/${notebookState.notebook.metadata.name}`,
            );
          },
        },
        { isSeparator: true },
        {
          title: <span data-testid="delete-workbench-action">Delete workbench</span>,
          onClick: () => {
            onNotebookDelete(notebookState.notebook);
          },
        },
      ]}
    />
  );
};
