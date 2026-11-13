import type { LLMdDeployment } from '@odh-dashboard/llmd-serving/types';
import type { MaaSFieldValue } from './MaaSEndpointCheckbox';

export const MAAS_DEFAULT_GATEWAY = {
  name: 'maas-default-gateway',
  namespace: 'openshift-ingress',
};

const MONITORING_SCRAPE_LABEL = 'monitoring.opendatahub.io/scrape';

const isMaaSGateway = (ref: { name?: string; namespace?: string }): boolean =>
  ref.name === MAAS_DEFAULT_GATEWAY.name && ref.namespace === MAAS_DEFAULT_GATEWAY.namespace;

const withMonitoringScrapeLabel = (
  labels: Record<string, string> | undefined,
  enabled: boolean,
): Record<string, string> | undefined => {
  const next = { ...labels };
  if (enabled) {
    next[MONITORING_SCRAPE_LABEL] = 'true';
    return next;
  }
  delete next[MONITORING_SCRAPE_LABEL];
  return Object.keys(next).length === 0 ? undefined : next;
};

/**
 * Applies MaaS endpoint configuration to an LLMInferenceService deployment.
 * When enabled, adds the maas-default-gateway to the router gateway refs.
 * When disabled, removes the maas-default-gateway from the router gateway refs.
 * Metrics scraping is kept only while the deployment is published as MaaS.
 */
export const applyMaaSEndpointData = (
  deployment: LLMdDeployment,
  fieldData: MaaSFieldValue,
): LLMdDeployment => {
  const result = structuredClone(deployment);
  const existingRefs = result.model.spec.router?.gateway?.refs ?? [];

  // Remove any existing MaaS gateway
  const filteredRefs = existingRefs.filter((ref) => !isMaaSGateway(ref));

  if (fieldData.isChecked) {
    // MaaS keeps Gen AI Studio visibly selected to reflect its forced UI state.
    // This transformer runs after the shared availability applicators, so remove their Gen AI
    // metadata here and let MaaSModelRef provide subscribed-user discovery.
    result.model.spec.router = {
      ...result.model.spec.router,
      gateway: {
        ...result.model.spec.router?.gateway,
        refs: [...filteredRefs, MAAS_DEFAULT_GATEWAY],
      },
    };
    delete result.model.metadata.annotations?.['security.opendatahub.io/enable-auth'];
    delete result.model.metadata.labels?.['opendatahub.io/genai-asset'];
    delete result.model.metadata.annotations?.['opendatahub.io/genai-use-case'];
  } else if (filteredRefs.length > 0) {
    // Keep other gateways if they exist
    result.model.spec.router = {
      ...result.model.spec.router,
      gateway: {
        ...result.model.spec.router?.gateway,
        refs: filteredRefs,
      },
    };
  } else if (result.model.spec.router?.gateway?.refs !== undefined) {
    // Remove empty refs array
    delete result.model.spec.router.gateway.refs;
  }

  const scrapeLabels = withMonitoringScrapeLabel(
    result.model.spec.labels,
    fieldData.isChecked && fieldData.enableMetricsScraping === true,
  );
  if (scrapeLabels === undefined) {
    delete result.model.spec.labels;
  } else {
    result.model.spec.labels = scrapeLabels;
  }

  return result;
};

/**
 * Extracts MaaS endpoint configuration from an LLMInferenceService deployment.
 * Returns isChecked: true if the maas-default-gateway is present in the router gateway refs.
 */
export const extractMaaSEndpointData = (deployment: LLMdDeployment): MaaSFieldValue | undefined => {
  const refs = deployment.model.spec.router?.gateway?.refs ?? [];
  const hasMaaSGateway = refs.some(isMaaSGateway);

  if (!hasMaaSGateway) {
    return undefined;
  }

  return {
    isChecked: true,
    enableMetricsScraping: deployment.model.spec.labels?.[MONITORING_SCRAPE_LABEL] === 'true',
  };
};
