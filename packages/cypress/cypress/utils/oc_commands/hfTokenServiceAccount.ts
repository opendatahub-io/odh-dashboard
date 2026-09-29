import { ensureAdminOcSession, execWithOutput } from './baseCommands';

type HfTokenDeploymentKind = 'InferenceService' | 'LLMInferenceService';

/**
 * Verifies Hugging Face API key wiring after catalog deploy:
 * - Deployment uses `{name}-hf-sa`
 * - Dashboard-managed ServiceAccount has ownerRef to the deployment
 * - A dashboard-labeled Secret with HF_TOKEN is owned by the deployment
 * - Model/main container does not inject HF_TOKEN via container env
 *
 * Does not wait for Ready (model download may fail without GPU / with rate limits).
 */
export const verifyHfTokenServiceAccountWiring = (
  deploymentName: string,
  namespace: string,
  kind: HfTokenDeploymentKind = 'LLMInferenceService',
): Cypress.Chainable<undefined> => {
  const saName = `${deploymentName}-hf-sa`;
  const saPath =
    kind === 'LLMInferenceService'
      ? '.spec.template.serviceAccountName'
      : '.spec.predictor.serviceAccountName';
  const maxAttempts = 36; // ~3 minutes at 5s
  let attempts = 0;

  ensureAdminOcSession();

  const checkWiring = (): Cypress.Chainable<undefined> => {
    attempts += 1;
    const saCmd = `oc get ${kind} ${deploymentName} -n ${namespace} -o jsonpath='{${saPath}}'`;
    return execWithOutput(saCmd, 30).then((saResult) => {
      const serviceAccountName = saResult.stdout.trim();
      if (saResult.exitCode !== 0 || serviceAccountName !== saName) {
        // Fail fast when the cluster still uses legacy container-env HF_TOKEN injection
        // (no ServiceAccount). Polling will never succeed on that dashboard build.
        const envPath =
          kind === 'LLMInferenceService'
            ? '.spec.template.spec.containers[*].env[*].name'
            : '.spec.predictor.model.env[*].name';
        const envCmd = `oc get ${kind} ${deploymentName} -n ${namespace} -o jsonpath='{${envPath}}'`;
        return execWithOutput(envCmd, 30).then((envResult) => {
          const envNames = envResult.stdout.trim();
          if (envNames.split(/\s+/).includes('HF_TOKEN')) {
            throw new Error(
              `${kind}/${deploymentName} has HF_TOKEN container env and empty/wrong serviceAccountName="${serviceAccountName}" ` +
                `(expected ${saName}). The dashboard under test is still using legacy env injection, not ` +
                `{deployment}-hf-sa ServiceAccount wiring. Point Cypress at a build that includes the SA path ` +
                `(local FE with that code, or a cluster image that has it).`,
            );
          }
          if (attempts >= maxAttempts) {
            throw new Error(
              `Expected ${kind}/${deploymentName} ${saPath}=${saName}, got "${serviceAccountName}" (exit ${saResult.exitCode})`,
            );
          }
          // eslint-disable-next-line cypress/no-unnecessary-waiting -- poll for async post-deploy SA attach
          return cy.wait(5000).then(() => checkWiring());
        });
      }

      const ownerCmd = `oc get sa ${saName} -n ${namespace} -o jsonpath='{.metadata.labels.opendatahub\\.io/dashboard}{"|"}{.metadata.ownerReferences[0].kind}/{.metadata.ownerReferences[0].name}'`;
      return execWithOutput(ownerCmd, 30).then((ownerResult) => {
        const [dashboardLabel, ownerRef] = ownerResult.stdout.trim().split('|');
        if (
          ownerResult.exitCode !== 0 ||
          dashboardLabel !== 'true' ||
          ownerRef !== `${kind}/${deploymentName}`
        ) {
          if (attempts >= maxAttempts) {
            throw new Error(
              `HF ServiceAccount wiring incomplete for ${saName}: label=${dashboardLabel} owner=${ownerRef}`,
            );
          }
          // eslint-disable-next-line cypress/no-unnecessary-waiting -- poll for SA ownerRef patch
          return cy.wait(5000).then(() => checkWiring());
        }

        // Prefer a dashboard-labeled Secret with HF_TOKEN; SA.secrets may list dockercfg first.
        const secretListCmd = `oc get secret -n ${namespace} -l opendatahub.io/dashboard=true -o json`;
        return execWithOutput(secretListCmd, 30).then((secretListResult) => {
          if (secretListResult.exitCode !== 0) {
            if (attempts >= maxAttempts) {
              throw new Error(`Failed to list dashboard secrets in ${namespace}`);
            }
            // eslint-disable-next-line cypress/no-unnecessary-waiting -- poll for Secret create/ownerRef
            return cy.wait(5000).then(() => checkWiring());
          }

          let secretName = '';
          let secretOwner = '';
          try {
            const parsed = JSON.parse(secretListResult.stdout) as {
              items?: Array<{
                metadata?: {
                  name?: string;
                  ownerReferences?: Array<{ kind?: string; name?: string }>;
                };
                data?: Record<string, string>;
              }>;
            };
            const match = (parsed.items ?? []).find((item) => {
              const ownedByDeployment = (item.metadata?.ownerReferences ?? []).some(
                (ref) => ref.kind === kind && ref.name === deploymentName,
              );
              return ownedByDeployment && Boolean(item.data?.HF_TOKEN);
            });
            secretName = match?.metadata?.name ?? '';
            const owner = match?.metadata?.ownerReferences?.find(
              (ref) => ref.kind === kind && ref.name === deploymentName,
            );
            secretOwner = owner?.kind && owner.name ? `${owner.kind}/${owner.name}` : '';
          } catch {
            secretName = '';
          }

          if (!secretName || secretOwner !== `${kind}/${deploymentName}`) {
            if (attempts >= maxAttempts) {
              throw new Error(
                `HF Secret wiring incomplete for ${deploymentName}: secret=${secretName} owner=${secretOwner}`,
              );
            }
            // eslint-disable-next-line cypress/no-unnecessary-waiting -- poll for Secret ownerRef patch
            return cy.wait(5000).then(() => checkWiring());
          }

          // Ensure no HF_TOKEN env on the model/main container (token must come from the ServiceAccount).
          const envPath =
            kind === 'LLMInferenceService'
              ? '.spec.template.spec.containers[*].env[*].name'
              : '.spec.predictor.model.env[*].name';
          const envCmd = `oc get ${kind} ${deploymentName} -n ${namespace} -o jsonpath='{${envPath}}'`;
          return execWithOutput(envCmd, 30).then((envResult) => {
            const envNames = envResult.stdout.trim();
            if (envNames.split(/\s+/).includes('HF_TOKEN')) {
              throw new Error(
                `${kind}/${deploymentName} still has HF_TOKEN container env; expected ServiceAccount-mounted token only`,
              );
            }
            cy.log(
              `✓ HF ServiceAccount wiring verified: ${kind}/${deploymentName} → SA ${saName} → Secret ${secretName}`,
            );
            return cy.wrap(undefined);
          });
        });
      });
    });
  };

  return checkWiring();
};
