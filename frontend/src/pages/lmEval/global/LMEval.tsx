import React from 'react';
import {
  EmptyStateActions,
  EmptyStateFooter,
  EmptyStateBody,
  EmptyStateVariant,
  EmptyState,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { ProjectObjectType } from '#~/concepts/design/utils';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import LMEvalProjectSelector from '#~/pages/lmEval/components/LMEvalProjectSelector';
import { LMEvalContext } from './LMEvalContext';
import LMEvalLoading from './LMEvalLoading';
import LMEvalListView from './lmEvalList/LMEvalListView';
import EvaluateModelButton from './EvaluateModelButton';
import { evaluationsPageTitle, evaluationsPageDescription } from './consts';

const LMEval = (): React.ReactElement => {
  const navigate = useNavigate();
  const { lmEval, project, preferredProject, projects } = React.useContext(LMEvalContext);
  const [lmEvalData, lmEvalLoaded, lmEvalLoadError] = lmEval;

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No model evaluation runs"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No evaluation runs have been started for models in this project. Start a new evaluation run,
        or select a different project.
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <EvaluateModelButton />
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={lmEvalData.length === 0}
      emptyStatePage={emptyState}
      title={
        <TitleWithIcon
          title={evaluationsPageTitle}
          objectType={ProjectObjectType.modelEvaluation}
        />
      }
      description={evaluationsPageDescription}
      loadError={lmEvalLoadError}
      loaded={lmEvalLoaded}
      headerContent={
        <LMEvalProjectSelector
          getRedirectPath={(ns: string) => `/develop-train/evaluations/${ns}`}
        />
      }
      provideChildrenPadding
      loadingContent={
        project ? undefined : (
          <LMEvalLoading
            title="Loading"
            description="Retrieving model evaluations from all projects in the cluster. This can take a few minutes."
            onCancel={() => {
              const redirectProject = preferredProject ?? projects?.[0];
              if (redirectProject) {
                navigate(`/develop-train/evaluations/${redirectProject.metadata.name}`);
              }
            }}
          />
        )
      }
    >
      <LMEvalListView lmEval={lmEvalData} />
    </ApplicationsPage>
  );
};

export default LMEval;
