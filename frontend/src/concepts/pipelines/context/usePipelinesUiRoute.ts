import { PIPELINE_ROUTE_NAME_PREFIX } from '~/concepts/pipelines/const';
import { usePipelinesAPI } from './PipelinesContext';
import usePipelineNamespaceCR, { dspaLoaded } from './usePipelineNamespaceCR';
import usePipelinesAPIRoute from './usePipelinesAPIRoute';

export const usePipelinesUiRoute = (): [string, boolean] => {
  const { namespace } = usePipelinesAPI();
  const crState = usePipelineNamespaceCR(namespace);
  const isCrReady = dspaLoaded(crState);
  const [pipelinesApiRoute, isPipelinesApiRouteLoaded] = usePipelinesAPIRoute(
    isCrReady,
    crState[0]?.metadata.name ?? '',
    namespace,
  );
  let uiRoute = '';

  if (pipelinesApiRoute) {
    const [protocol, appHost] = pipelinesApiRoute.split(PIPELINE_ROUTE_NAME_PREFIX);
    uiRoute = `${protocol}${PIPELINE_ROUTE_NAME_PREFIX}ui-${appHost}`;
  }

  return [uiRoute, isPipelinesApiRouteLoaded];
};
