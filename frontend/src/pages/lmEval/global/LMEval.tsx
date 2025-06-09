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

const title = 'Model evaluations';
const description = 'Evaluate your model';

const LMEval = (): React.ReactElement => {
  const navigate = useNavigate();
  const { lmEval, project, preferredProject, projects } = React.useContext(LMEvalContext);

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No evaluations on this project"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No evaluations have been generated within this project
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
      empty={lmEval.data.length === 0}
      emptyStatePage={emptyState}
      title={<TitleWithIcon title={title} objectType={ProjectObjectType.acceleratorProfile} />}
      description={description}
      loadError={lmEval.error}
      loaded={lmEval.loaded}
      headerContent={
        <LMEvalProjectSelector getRedirectPath={(ns: string) => `/modelEvaluations/${ns}`} />
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
                navigate(`/modelEvaluations/${redirectProject.metadata.name}`);
              }
            }}
          />
        )
      }
    >
      <LMEvalListView lmEval={lmEval.data} />
    </ApplicationsPage>
  );
};

export default LMEval;
