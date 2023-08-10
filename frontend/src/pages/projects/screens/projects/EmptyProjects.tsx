import * as React from 'react';
import {
  ButtonVariant,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateSecondaryActions,
  Title,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import { useAppContext } from '~/app/AppContext';
import LaunchJupyterButton from '~/pages/projects/screens/projects/LaunchJupyterButton';
import NewProjectButton from './NewProjectButton';

type EmptyProjectsProps = {
  allowCreate: boolean;
};

const EmptyProjects: React.FC<EmptyProjectsProps> = ({ allowCreate }) => {
  const navigate = useNavigate();
  const { dashboardConfig } = useAppContext();
  return (
    <EmptyState>
      <EmptyStateIcon icon={CubesIcon} />
      <Title headingLevel="h2" size="lg">
        No data science projects yet.
      </Title>
      <EmptyStateBody>
        {allowCreate
          ? `To get started, create a data science project${
              dashboardConfig.spec.notebookController?.enabled
                ? ' or launch a notebook with Jupyter'
                : ''
            }.`
          : `To get started, ask your ${ODH_PRODUCT_NAME} admin for a data science project${
              dashboardConfig.spec.notebookController?.enabled
                ? ' or launch a notebook with Jupyter'
                : ''
            }.`}
      </EmptyStateBody>
      {allowCreate ? (
        <>
          <NewProjectButton
            onProjectCreated={(projectName) => navigate(`/projects/${projectName}`)}
          />
          {dashboardConfig.spec.notebookController?.enabled && (
            <EmptyStateSecondaryActions>
              <LaunchJupyterButton variant={ButtonVariant.link} />
            </EmptyStateSecondaryActions>
          )}
        </>
      ) : (
        <LaunchJupyterButton variant={ButtonVariant.primary} />
      )}
    </EmptyState>
  );
};

export default EmptyProjects;
