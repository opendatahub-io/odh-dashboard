import * as React from 'react';
import { BreadcrumbItem } from '@patternfly/react-core';
import { useParams, useSearchParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { DeploymentMode, useModularArchContext } from 'mod-arch-core';
import { evaluationsBaseRoute, projectHomeRoute } from '~/app/routes';
import ContextBreadcrumb from '~/app/components/ContextBreadcrumb';
import { useProjectDisplayName } from '~/app/hooks/useProjectDisplayName';
import MlflowCompareRuns from '~/app/components/MlflowCompareRuns';
import { parseMlflowArrayParam } from '~/app/utilities/compareEvaluationsUtils';
import { createEvalHubTrackingScope } from '~/app/tracking/evalhubTracking';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';

const CompareEvaluationsPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const [searchParams] = useSearchParams();
  const projectDisplayName = useProjectDisplayName(namespace);
  const trackingScope = React.useRef(createEvalHubTrackingScope()).current;

  React.useEffect(() => () => trackingScope.clear(), [trackingScope]);

  const {
    config: { deploymentMode },
  } = useModularArchContext();

  const runUuids = React.useMemo(
    () => parseMlflowArrayParam(searchParams.get('runs')),
    [searchParams],
  );
  const experimentIds = React.useMemo(
    () => parseMlflowArrayParam(searchParams.get('experiments')),
    [searchParams],
  );
  const evaluationNames = React.useMemo(
    () => parseMlflowArrayParam(searchParams.get('names')),
    [searchParams],
  );

  const hasValidParams = experimentIds.length > 1 && experimentIds.length === runUuids.length;

  const showCompare = deploymentMode === DeploymentMode.Federated && hasValidParams;

  // Emitted only from a confirmed remote render — a compare view that is still
  // loading or fell back to the unavailable state is not a successful render.
  const handleRemoteReady = React.useCallback(
    (available: boolean) => {
      if (available) {
        trackingScope.trackEventOnce(
          EVAL_HUB_EVENTS.COMPARISON_VIEW_RENDERED,
          `${namespace ?? ''}:${runUuids.join(',')}:${experimentIds.join(',')}`,
          { surface: 'comparison_view', countOfRuns: runUuids.length },
        );
      }
    },
    [experimentIds, namespace, runUuids, trackingScope],
  );

  const title = React.useMemo(() => {
    if (evaluationNames.length < 2) {
      return 'Compare runs';
    }
    if (evaluationNames.length === 2) {
      return `Comparing ${evaluationNames[0]} and ${evaluationNames[1]}`;
    }
    return `Comparing ${evaluationNames[0]}, ${evaluationNames[1]} and ${
      evaluationNames.length - 2
    } more`;
  }, [evaluationNames]);

  return (
    <ApplicationsPage
      title={title}
      breadcrumb={
        <ContextBreadcrumb
          pageName="Evaluations"
          projectDisplayName={projectDisplayName}
          homePath={evaluationsBaseRoute(namespace)}
          projectHomePath={projectHomeRoute(namespace)}
        >
          <BreadcrumbItem isActive>Compare evaluations</BreadcrumbItem>
        </ContextBreadcrumb>
      }
      loaded
      empty={!hasValidParams}
      emptyMessage="Provide at least two runs and experiments to compare."
      provideChildrenPadding
    >
      {showCompare ? (
        <MlflowCompareRuns
          key={runUuids.join(',')}
          experimentIds={experimentIds}
          runUuids={runUuids}
          workspace={namespace}
          onRemoteReady={handleRemoteReady}
        />
      ) : null}
    </ApplicationsPage>
  );
};

export default CompareEvaluationsPage;
