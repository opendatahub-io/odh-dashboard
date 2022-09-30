import * as React from 'react';
import { Link } from 'react-router-dom';
import { ActionList, ActionListItem, Button } from '@patternfly/react-core';
import { ProjectKind } from '../../../../k8sTypes';

type FormFooterProps = {
  project: ProjectKind;
};

const FormFooter: React.FC<FormFooterProps> = ({ project }) => {
  return (
    <ActionList>
      <ActionListItem>
        <Button variant="primary" id="create-button">
          Create
        </Button>
      </ActionListItem>
      <ActionListItem>
        <Button variant="secondary" id="create-and-start-button">
          Create and start
        </Button>
      </ActionListItem>
      <ActionListItem>
        <Button variant="link" id="cancel-button">
          <Link to={`/projects/${project.metadata.name}`}>Cancel</Link>
        </Button>
      </ActionListItem>
    </ActionList>
  );
};

export default FormFooter;
