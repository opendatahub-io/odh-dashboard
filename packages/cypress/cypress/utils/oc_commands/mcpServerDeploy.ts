import { applyOpenShiftYaml, execWithOutput, pollUntilSuccess } from './baseCommands';
import { replacePlaceholdersInYaml } from '../yaml_files';
import type { CommandLineResult } from '../../types';

export interface McpServerDeployConfig {
  serviceAccountName: string;
  clusterRoleBindingName: string;
  configMapName: string;
}

/**
 * Creates the prerequisite resources for MCP server deploy testing:
 * - ServiceAccount used by the MCP server pod
 * - ClusterRoleBinding granting the service account cluster view access
 * - ConfigMap containing the MCP server runtime configuration
 *
 * @param projectName The namespace/project where resources are created
 * @param config Resource names for the setup
 */
export const setupMcpServerDeployResources = (
  projectName: string,
  config: McpServerDeployConfig,
): void => {
  const { serviceAccountName, clusterRoleBindingName, configMapName } = config;
  const replacements = {
    NAMESPACE: projectName,
    SERVICE_ACCOUNT_NAME: serviceAccountName,
    CLUSTER_ROLE_BINDING_NAME: clusterRoleBindingName,
    CONFIG_MAP_NAME: configMapName,
  };

  cy.log(`Setting up MCP server deploy prerequisites in project: ${projectName}`);

  cy.fixture('resources/yaml/mcp_server_deploy_resources.yaml').then((yamlContent: string) => {
    applyOpenShiftYaml(replacePlaceholdersInYaml(yamlContent, replacements));
  });
};

/**
 * Removes cluster-scoped MCP server deploy resources that survive project deletion.
 * The ClusterRoleBinding must be deleted explicitly since it is not namespace-scoped.
 *
 * @param clusterRoleBindingName Name of the ClusterRoleBinding to delete
 */
export const cleanupMcpServerDeployResources = (
  clusterRoleBindingName: string,
): Cypress.Chainable<CommandLineResult> => {
  cy.log(`Cleaning up MCP server deploy cluster resources: ${clusterRoleBindingName}`);
  return execWithOutput(
    `oc delete clusterrolebinding ${clusterRoleBindingName} --ignore-not-found`,
    30,
  );
};

/**
 * Verifies that an MCPServer CR with the given name exists in the namespace.
 *
 * @param projectName The namespace to check
 * @param deploymentName The name of the MCPServer CR
 */
export const verifyMcpServerCRExists = (
  projectName: string,
  deploymentName: string,
): Cypress.Chainable<CommandLineResult> => {
  cy.log(`Verifying MCPServer CR '${deploymentName}' exists in namespace: ${projectName}`);
  return execWithOutput(`oc get mcpserver ${deploymentName} -n ${projectName}`, 30);
};

/**
 * Polls until an MCPServer CR in the given namespace reaches the Running phase.
 * Running phase maps to "Available" in the UI.
 *
 * @param projectName The namespace containing the MCPServer CR
 */
export const waitForMcpDeploymentAvailable = (
  projectName: string,
): Cypress.Chainable<Cypress.Exec> => {
  cy.log(`Waiting for MCP deployment to become Available in namespace: ${projectName}`);
  return pollUntilSuccess(
    `oc get mcpserver -n ${projectName} -o jsonpath='{.items[0].status.phase}' | grep -q Running`,
    `MCP deployment to become Available in ${projectName}`,
    { maxAttempts: 60, pollIntervalMs: 5000 },
  );
};

/**
 * Verifies the MCPServer CR exists then polls until it reaches the Running phase.
 *
 * @param projectName The namespace containing the MCPServer CR
 * @param deploymentName The name of the MCPServer CR
 */
export const verifyAndWaitForMcpDeployment = (
  projectName: string,
  deploymentName: string,
): void => {
  verifyMcpServerCRExists(projectName, deploymentName);
  waitForMcpDeploymentAvailable(projectName);
};
