import * as React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { useParams } from 'react-router-dom';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';

const EvaluateModelButton: React.FC = () => {
  const { projects } = React.useContext(ProjectsContext);
  const { namespace } = useParams<{ namespace: string }>();

  const project = projects.find(byName(namespace));
  const evaluateHref = project
    ? `/develop-train/evaluations/${project.metadata.name}/evaluate`
    : undefined;

  const deployButton = (
    <Button
      data-testid="evaluate-model-button"
      variant="primary"
      isAriaDisabled={!project}
      component={project ? 'a' : 'button'}
      href={evaluateHref}
    >
      Start evaluation run
    </Button>
  );

  if (!project) {
    return (
      <Tooltip data-testid="deploy-model-tooltip" content="To evaluate a model, select a project.">
        {deployButton}
      </Tooltip>
    );
  }

  return <>{deployButton}</>;
};

export default EvaluateModelButton;
