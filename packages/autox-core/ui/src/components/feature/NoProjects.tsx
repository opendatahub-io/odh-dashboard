import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionableEmptyState } from '../primitive';

interface NoProjectsProps {
  productName: string;
  /** Empty-state icon, e.g. `() => <img src={emptyStateImage} alt="..." />`. */
  icon: React.ComponentType;
  /** Route the "Go to Projects page" button navigates to. Defaults to `/projects`. */
  projectsRoute?: string;
}

function NoProjects({
  productName,
  icon,
  projectsRoute = '/projects',
}: NoProjectsProps): React.JSX.Element {
  const navigate = useNavigate();

  return (
    <ActionableEmptyState
      titleText="No projects"
      icon={icon}
      body={`To create an ${productName} experiment, first create a project.`}
      action={{
        label: 'Go to Projects page',
        onClick: () => navigate(projectsRoute),
      }}
    />
  );
}

export default NoProjects;
