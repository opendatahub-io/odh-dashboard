export const DEPLOY_BUTTON_TOOLTIP = {
  ENABLE_SINGLE_MODEL_SERVING:
    'To deploy this model, an administrator must first enable single-model serving in the cluster settings.',
  ENABLE_MODEL_SERVING_PLATFORM:
    'To enable model serving, an administrator must first select a model serving platform in the cluster settings.',
};

export const DEPLOYMENTS_TAB_EXTENSION_ID = 'deployments';

export const REGISTRY_SETTINGS_PAGE_TITLE = 'Model registry settings';
export const REGISTRY_SETTINGS_URL = '/settings/model-resources-operations/model-registry';

/**
 * Setup steps for the MCP gateway required by the MCP server for Red Hat OpenShift.
 * Pinned to an OpenShift docs version; update when the docs move.
 */
export const MCP_GATEWAY_SETUP_DOCS_URL =
  'https://docs.redhat.com/en/documentation/openshift_container_platform/4.22/html/ai_applications/mcp-server#ai-mcp-server-install_mcp-server-overview';
