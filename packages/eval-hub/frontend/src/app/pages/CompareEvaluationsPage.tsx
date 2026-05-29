import * as React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { DeploymentMode, useModularArchContext } from 'mod-arch-core';
import { evaluationsBaseRoute } from '~/app/routes';
import MlflowCompareRuns from '~/app/components/MlflowCompareRuns';

const parseIdList = (raw: string): string[] =>
  raw
    .split(',')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

const CompareEvaluationsPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const [searchParams] = useSearchParams();

  const {
    config: { deploymentMode },
  } = useModularArchContext();

  const experimentIds = parseIdList(searchParams.get('experimentIds') ?? '');
  const runUuids = parseIdList(searchParams.get('runUuids') ?? '');

  const hasValidParams = experimentIds.length > 0 && experimentIds.length === runUuids.length;
  const showCompare = deploymentMode === DeploymentMode.Federated && hasValidParams;
  const emptyMessage = !hasValidParams
    ? 'Provide matching experimentIds and runUuids query parameters to compare runs.'
    : 'Comparison is only available in federated deployment mode.';

  return (
    <ApplicationsPage
      title="Compare evaluations"
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={evaluationsBaseRoute(namespace)}>Evaluations</Link>}
          />
          <BreadcrumbItem isActive>Compare</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={!showCompare}
      emptyMessage={emptyMessage}
      provideChildrenPadding
    >
      <MlflowCompareRuns
        key={runUuids.join(',')}
        experimentIds={experimentIds}
        runUuids={runUuids}
        workspace={namespace}
      />
    </ApplicationsPage>
  );
};

export default CompareEvaluationsPage;
