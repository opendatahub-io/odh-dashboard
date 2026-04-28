/**
 * Namespace RoleBindings for `redhat-ods-applications:evalhub-service` in evaluation tenant namespaces.
 * Mirrors what the TrustyAI operator normally reconciles (e.g. on evalhub-odh); fresh clusters may omit these.
 *
 * ClusterRoles (namePrefix `trustyai-service-operator-` at install): see trustyai-service-operator
 * `config/components/evalhub/rbac/` — e.g. `evalhub-job-config`, `evalhub-jobs-writer`, `evalhub-mlflow-access`.
 */
const EVALHUB_SERVICE_SA = 'redhat-ods-applications:evalhub-service';

const MLFLOW_SERVICE_ROLEBINDING = 'evalhub-redhat-ods-applications-mlflow-service-rb';
const MLFLOW_SERVICE_CLUSTERROLE = 'trustyai-service-operator-evalhub-mlflow-access';

const JOB_CONFIG_ROLEBINDING = 'evalhub-redhat-ods-applications-job-config-rb';
const JOB_CONFIG_CLUSTERROLE = 'trustyai-service-operator-evalhub-job-config';

const JOBS_WRITER_ROLEBINDING = 'evalhub-redhat-ods-applications-jobs-writer-rb';
const JOBS_WRITER_CLUSTERROLE = 'trustyai-service-operator-evalhub-jobs-writer';

const ensureNamespaceClusterRoleBinding = (
  roleBindingName: string,
  clusterRoleName: string,
  tenantNamespace: string,
  description: string,
) => {
  const getRb = `oc get rolebinding ${roleBindingName} -n ${tenantNamespace} -o name --ignore-not-found`;
  return cy.exec(getRb, { failOnNonZeroExit: false }).then((r) => {
    if (r.stdout.trim()) {
      cy.log(`RoleBinding ${roleBindingName} already exists in ${tenantNamespace}`);
      return;
    }
    const createCmd = `oc -n ${tenantNamespace} create rolebinding ${roleBindingName} --clusterrole=${clusterRoleName} --serviceaccount=${EVALHUB_SERVICE_SA}`;
    return cy.exec(createCmd, { failOnNonZeroExit: false }).then((cr) => {
      if (cr.code !== 0) {
        throw new Error(`Failed to create ${description} in ${tenantNamespace}: ${cr.stderr}`);
      }
    });
  });
};

/** TrustyAI → MLflow (kubernetes-workspace / experiments API). */
export const ensureEvalHubMlflowServiceRoleBinding = (tenantNamespace: string): Cypress.Chainable =>
  ensureNamespaceClusterRoleBinding(
    MLFLOW_SERVICE_ROLEBINDING,
    MLFLOW_SERVICE_CLUSTERROLE,
    tenantNamespace,
    'Eval Hub MLflow service RoleBinding',
  );

/** EvalHub service creates job ConfigMaps in the tenant namespace (benchmark / LM eval jobs). */
export const ensureEvalHubJobConfigRoleBinding = (tenantNamespace: string): Cypress.Chainable =>
  ensureNamespaceClusterRoleBinding(
    JOB_CONFIG_ROLEBINDING,
    JOB_CONFIG_CLUSTERROLE,
    tenantNamespace,
    'Eval Hub job ConfigMap RoleBinding',
  );

/** EvalHub service creates `batch/jobs` in the tenant namespace (evaluation workloads). */
export const ensureEvalHubJobsWriterRoleBinding = (tenantNamespace: string): Cypress.Chainable =>
  ensureNamespaceClusterRoleBinding(
    JOBS_WRITER_ROLEBINDING,
    JOBS_WRITER_CLUSTERROLE,
    tenantNamespace,
    'Eval Hub jobs writer RoleBinding',
  );

/**
 * Applies RoleBindings the operator would create for `evalhub-service` in `tenantNamespace`:
 * job ConfigMaps, Batch jobs, and MLflow access. Idempotent.
 */
export const ensureEvalHubTenantRoleBindingsForEvalHubService = (
  tenantNamespace: string,
): Cypress.Chainable =>
  ensureEvalHubJobConfigRoleBinding(tenantNamespace)
    .then(() => ensureEvalHubJobsWriterRoleBinding(tenantNamespace))
    .then(() => ensureEvalHubMlflowServiceRoleBinding(tenantNamespace));
