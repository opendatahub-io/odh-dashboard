import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionList, ActionListItem, Button } from '@patternfly/react-core';
import { ProjectKind } from '../../../../k8sTypes';
import { createNotebook, createNotebookWithoutStarting } from '../../../../api';
import { StartNotebookData } from '../../../../types';
import { checkRequiredFieldsForNotebookStart } from './spawnerUtils';

type FormFooterProps = {
  project: ProjectKind;
  startData: StartNotebookData;
};

const FormFooter: React.FC<FormFooterProps> = ({ project, startData }) => {
  const navigate = useNavigate();
  const isButtonDisabled = !checkRequiredFieldsForNotebookStart(startData);
  return (
    <ActionList>
      <ActionListItem>
        <Button
          isDisabled={isButtonDisabled}
          variant="primary"
          id="create-button"
          onClick={() => createNotebookWithoutStarting(startData).then(() => navigate('/projects'))}
        >
          Create
        </Button>
      </ActionListItem>
      <ActionListItem>
        <Button
          isDisabled={isButtonDisabled}
          variant="secondary"
          id="create-and-start-button"
          onClick={() => createNotebook(startData).then(() => navigate('/projects'))}
        >
          Create and start
        </Button>
      </ActionListItem>
      <ActionListItem>
        <Button
          variant="link"
          id="cancel-button"
          onClick={() => navigate(`/projects/${project.metadata.name}`)}
        >
          Cancel
        </Button>
      </ActionListItem>
    </ActionList>
  );
};

export default FormFooter;
