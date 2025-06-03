import * as React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';

const EvaluateModelButton: React.FC = () => {
  const navigate = useNavigate();
  const { projects } = React.useContext(ProjectsContext);
  const { namespace } = useParams<{ namespace: string }>();

  const project = projects.find(byName(namespace));

  const deployButton = (
    <Button
      data-testid="deploy-button"
      variant="primary"
      isAriaDisabled={!project}
      onClick={() => project && navigate(`/lmEval/${project.metadata.name}/evaluate`)}
    >
      Evaluate model
    </Button>
  );

  if (!project) {
    return (
      <Tooltip data-testid="deploy-model-tooltip" content="To deploy a model, select a project.">
        {deployButton}
      </Tooltip>
    );
  }

  return <>{deployButton}</>;
};

export default EvaluateModelButton;
