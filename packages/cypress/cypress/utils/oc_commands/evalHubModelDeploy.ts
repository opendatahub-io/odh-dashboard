import { pollUntilSuccess } from './baseCommands';
import { checkInferenceServiceState } from './modelServing';
import { createCleanHardwareProfile } from './hardwareProfiles';
import type { EvalHubTestData } from '../../types';

/**
 * Grants a user EvalHub tenant access in the namespace. Creates the `evalhub-evaluator` Role
 * (evaluations, collections, providers + MLflow experiments) and binds the user to it.
 */
export function grantEvalHubTenantAccess(ns: string, username: string): void {
  const roleYaml = `
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: evalhub-evaluator
  namespace: ${ns}
rules:
  - apiGroups: ["trustyai.opendatahub.io"]
    resources: ["evaluations", "collections", "providers"]
    verbs: ["get", "list", "create", "update", "delete"]
  - apiGroups: ["mlflow.kubeflow.org"]
    resources: ["experiments"]
    verbs: ["create", "get"]
`;
  const tmpFile = `/tmp/evalhub-evaluator-role-${ns}.yaml`;
  cy.writeFile(tmpFile, roleYaml);
  cy.exec(`oc apply -f ${tmpFile}`, { failOnNonZeroExit: false });
  cy.exec(
    `oc create rolebinding e2e-tenant-evaluator --role=evalhub-evaluator --user=${username} -n ${ns}`,
    { failOnNonZeroExit: false },
  );
}

export function getVllmEndpointUrl(td: EvalHubTestData, ns: string): string {
  return `http://${td.inferenceServiceName}-predictor.${ns}.svc.cluster.local:8080`;
}

export function setupTenantAndDeployModel(
  ns: string,
  td: EvalHubTestData,
  hwProfileName: string,
): void {
  cy.step('Label namespace so TrustyAI operator provisions tenant RBAC');
  cy.exec(
    `oc label namespace ${ns} opendatahub.io/generated-namespace=true evalhub.trustyai.opendatahub.io/tenant= --overwrite`,
  );

  cy.step('Wait for operator to reconcile tenant resources');
  pollUntilSuccess(
    `oc -n ${ns} get sa evalhub-redhat-ods-applications-job -o name`,
    'operator-provisioned ServiceAccount',
    { maxAttempts: 30, pollIntervalMs: 2000 },
  );
  pollUntilSuccess(
    `oc -n ${ns} get configmap evalhub-service-ca -o name`,
    'operator-provisioned evalhub-service-ca ConfigMap',
    { maxAttempts: 30, pollIntervalMs: 2000 },
  );
  pollUntilSuccess(
    `oc -n ${ns} get role evalhub-redhat-ods-applications-job-access-role -o name`,
    'operator-provisioned status-events Role',
    { maxAttempts: 30, pollIntervalMs: 2000 },
  );

  cy.step('Deploy vLLM model in tenant namespace');
  const {
    inferenceServiceName,
    modelOciUri,
    servingRuntimeYamlPath,
    hardwareProfileResourceYamlPath,
  } = td;

  createCleanHardwareProfile(hardwareProfileResourceYamlPath);

  cy.fixture(servingRuntimeYamlPath, 'utf8').then((srYaml: string) => {
    const tmpFile = `/tmp/evalhub-sr-${ns}.yaml`;
    cy.writeFile(tmpFile, srYaml);
    cy.exec(`oc apply -n ${ns} -f ${tmpFile}`, { failOnNonZeroExit: false }).then((result) => {
      if (result.exitCode !== 0) {
        throw new Error(`ServingRuntime apply failed: ${result.stderr}`);
      }
    });
  });

  cy.fixture('resources/eval-hub/evalhub-inference-service.yaml', 'utf8').then(
    (isvcTemplate: string) => {
      const isvcYaml = isvcTemplate
        .replace('__ISVC_NAME__', inferenceServiceName)
        .replace('__HW_PROFILE__', hwProfileName)
        .replace('__MODEL_URI__', modelOciUri);
      const isvcTmpFile = `/tmp/evalhub-isvc-${ns}.yaml`;
      cy.writeFile(isvcTmpFile, isvcYaml);
      cy.exec(`oc apply -n ${ns} -f ${isvcTmpFile}`, { failOnNonZeroExit: false }).then(
        (result) => {
          if (result.exitCode !== 0) {
            throw new Error(`InferenceService apply failed: ${result.stderr}`);
          }
        },
      );
    },
  );

  cy.step('Wait for InferenceService to be Ready');
  checkInferenceServiceState(inferenceServiceName, ns, { checkReady: true });
}
