import * as React from 'react';
import {
  ButtonVariant,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateActions,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import LaunchJupyterButton from '~/pages/projects/screens/projects/LaunchJupyterButton';
import { useCheckJupyterEnabled } from '~/utilities/notebookControllerUtils';
import NewProjectButton from './NewProjectButton';

type EmptyProjectsProps = {
  allowCreate: boolean;
};

const EmptyProjects: React.FC<EmptyProjectsProps> = ({ allowCreate }) => {
  const navigate = useNavigate();
  const isJupyterEnabled = useCheckJupyterEnabled();
  return (
    <EmptyState>
      <EmptyStateHeader
        data-testid="no-data-science-project"
        titleText="No data science projects yet."
        icon={<EmptyStateIcon icon={CubesIcon} />}
        headingLevel="h2"
      />
      <EmptyStateBody>
        {allowCreate
          ? `To get started, create a data science project${
              isJupyterEnabled ? ' or launch a notebook with Jupyter' : ''
            }.`
          : `To get started, ask your ${ODH_PRODUCT_NAME} admin for a data science project${
              isJupyterEnabled ? ' or launch a notebook with Jupyter' : ''
            }.`}
      </EmptyStateBody>
      <EmptyStateFooter>
        {allowCreate ? (
          <>
            <NewProjectButton
              onProjectCreated={(projectName) => navigate(`/projects/${projectName}`)}
            />
            <EmptyStateActions>
              <LaunchJupyterButton variant={ButtonVariant.link} />
            </EmptyStateActions>
          </>
        ) : (
          <LaunchJupyterButton variant={ButtonVariant.primary} />
        )}
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default EmptyProjects;
