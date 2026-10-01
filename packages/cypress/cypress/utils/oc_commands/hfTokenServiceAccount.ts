import { ensureAdminOcSession, execWithOutput } from './baseCommands';

type HfTokenDeploymentKind = 'InferenceService' | 'LLMInferenceService';

type OwnerRef = {
  kind?: string;
  name?: string;
};

/** Shared poll budget for the full wiring check (not per sub-check). */
const DEFAULT_MAX_ATTEMPTS = 36;

const getContainerEnvPath = (kind: HfTokenDeploymentKind): string =>
  kind === 'LLMInferenceService'
    ? '.spec.template.spec.containers[*].env[*].name'
    : '.spec.predictor.model.env[*].name';

const getServiceAccountPath = (kind: HfTokenDeploymentKind): string =>
  kind === 'LLMInferenceService'
    ? '.spec.template.serviceAccountName'
    : '.spec.predictor.serviceAccountName';

const hasOwnerRef = (
  ownerReferences: OwnerRef[] | undefined,
  kind: string,
  name: string,
): boolean => (ownerReferences ?? []).some((ref) => ref.kind === kind && ref.name === name);

type SaNameCheck =
  | { ok: true; saName: string }
  | { ok: false; serviceAccountName: string; exitCode: number };

type OwnerCheck =
  | { ok: true }
  | { ok: false; dashboardLabel: string; ownedByDeployment: boolean; exitCode: number };

type SecretCheck = { ok: true; secretName: string } | { ok: false };

/**
 * One-shot: does the deployment reference `{name}-hf-sa`?
 */
export const checkDeploymentUsesHfServiceAccount = (
  deploymentName: string,
  namespace: string,
  kind: HfTokenDeploymentKind,
): Cypress.Chainable<SaNameCheck> => {
  const saName = `${deploymentName}-hf-sa`;
  const saPath = getServiceAccountPath(kind);
  const saCmd = `oc get ${kind} ${deploymentName} -n ${namespace} -o jsonpath='{${saPath}}'`;

  return execWithOutput(saCmd, 30).then((saResult): SaNameCheck => {
    const serviceAccountName = saResult.stdout.trim();
    if (saResult.exitCode === 0 && serviceAccountName === saName) {
      return { ok: true, saName };
    }
    return {
      ok: false,
      serviceAccountName,
      exitCode: saResult.exitCode,
    };
  });
};

/**
 * One-shot: is the HF ServiceAccount dashboard-labeled and owned by the deployment?
 * Searches all ownerReferences (not only [0]).
 */
export const checkHfServiceAccountOwnerRefs = (
  deploymentName: string,
  namespace: string,
  kind: HfTokenDeploymentKind,
): Cypress.Chainable<OwnerCheck> => {
  const saName = `${deploymentName}-hf-sa`;
  const ownerCmd = `oc get sa ${saName} -n ${namespace} -o json`;

  return execWithOutput(ownerCmd, 30).then((ownerResult): OwnerCheck => {
    let dashboardLabel = '';
    let ownedByDeployment = false;

    if (ownerResult.exitCode === 0) {
      try {
        const parsed = JSON.parse(ownerResult.stdout) as {
          metadata?: {
            labels?: Record<string, string>;
            ownerReferences?: OwnerRef[];
          };
        };
        dashboardLabel = parsed.metadata?.labels?.['opendatahub.io/dashboard'] ?? '';
        ownedByDeployment = hasOwnerRef(parsed.metadata?.ownerReferences, kind, deploymentName);
      } catch {
        dashboardLabel = '';
        ownedByDeployment = false;
      }
    }

    if (ownerResult.exitCode === 0 && dashboardLabel === 'true' && ownedByDeployment) {
      return { ok: true };
    }
    return {
      ok: false,
      dashboardLabel,
      ownedByDeployment,
      exitCode: ownerResult.exitCode,
    };
  });
};

/**
 * One-shot: is there a dashboard-labeled Secret with HF_TOKEN owned by the deployment,
 * and does the HF ServiceAccount reference that Secret?
 */
export const checkHfTokenSecretOwnerRefs = (
  deploymentName: string,
  namespace: string,
  kind: HfTokenDeploymentKind,
): Cypress.Chainable<SecretCheck> => {
  const saName = `${deploymentName}-hf-sa`;
  const secretListCmd = `oc get secret -n ${namespace} -l opendatahub.io/dashboard=true -o json`;

  return execWithOutput(secretListCmd, 30).then((secretListResult) => {
    if (secretListResult.exitCode !== 0) {
      return cy.wrap({ ok: false } satisfies SecretCheck);
    }

    let secretName = '';
    try {
      const parsed = JSON.parse(secretListResult.stdout) as {
        items?: Array<{
          metadata?: {
            name?: string;
            ownerReferences?: OwnerRef[];
          };
          data?: Record<string, string>;
        }>;
      };
      const match = (parsed.items ?? []).find((item) => {
        const ownedByDeployment = hasOwnerRef(item.metadata?.ownerReferences, kind, deploymentName);
        return ownedByDeployment && Boolean(item.data?.HF_TOKEN);
      });
      secretName = match?.metadata?.name ?? '';
    } catch {
      return cy.wrap({ ok: false } satisfies SecretCheck);
    }

    if (!secretName) {
      return cy.wrap({ ok: false } satisfies SecretCheck);
    }

    const saCmd = `oc get sa ${saName} -n ${namespace} -o json`;
    return execWithOutput(saCmd, 30).then((saResult): SecretCheck => {
      if (saResult.exitCode !== 0) {
        return { ok: false };
      }

      try {
        const sa = JSON.parse(saResult.stdout) as {
          secrets?: Array<{ name?: string }>;
        };
        const referenced = (sa.secrets ?? []).some((ref) => ref.name === secretName);
        if (referenced) {
          return { ok: true, secretName };
        }
      } catch {
        // fall through
      }
      return { ok: false };
    });
  });
};

/**
 * Verifies the model/main container does not inject HF_TOKEN via env.
 */
export const verifyNoHfTokenContainerEnv = (
  deploymentName: string,
  namespace: string,
  kind: HfTokenDeploymentKind = 'LLMInferenceService',
): Cypress.Chainable<undefined> => {
  const envPath = getContainerEnvPath(kind);
  const envCmd = `oc get ${kind} ${deploymentName} -n ${namespace} -o jsonpath='{${envPath}}'`;

  return execWithOutput(envCmd, 30).then((envResult) => {
    const envNames = envResult.stdout.trim();
    if (envNames.split(/\s+/).includes('HF_TOKEN')) {
      throw new Error(
        `${kind}/${deploymentName} still has HF_TOKEN container env; expected ServiceAccount-mounted token only`,
      );
    }
    return cy.wrap(undefined);
  });
};

/**
 * Verifies Hugging Face API key wiring after deploy:
 * - Deployment uses `{name}-hf-sa`
 * - Dashboard-managed ServiceAccount has ownerRef to the deployment
 * - A dashboard-labeled Secret with HF_TOKEN is owned by the deployment and
 *   referenced by the HF ServiceAccount
 * - Model/main container does not inject HF_TOKEN via container env
 *
 * Does not wait for Ready (model download may fail without GPU / with rate limits).
 *
 * Polling: up to 36 shared attempts with 5s between retries across all wiring
 * checks (same budget as before the split). Each attempt may run several `oc`
 * calls (30s timeout each), so wall-clock time can exceed several minutes when
 * the cluster is slow — not a fixed ~3 minutes.
 */
export const verifyHfTokenServiceAccountWiring = (
  deploymentName: string,
  namespace: string,
  kind: HfTokenDeploymentKind = 'LLMInferenceService',
): Cypress.Chainable<undefined> => {
  const saName = `${deploymentName}-hf-sa`;
  const saPath = getServiceAccountPath(kind);
  let attempts = 0;

  ensureAdminOcSession();

  const checkWiring = (): Cypress.Chainable<undefined> => {
    attempts += 1;

    return checkDeploymentUsesHfServiceAccount(deploymentName, namespace, kind).then((saCheck) => {
      if (!saCheck.ok) {
        if (attempts >= DEFAULT_MAX_ATTEMPTS) {
          throw new Error(
            `Expected ${kind}/${deploymentName} ${saPath}=${saName}, got "${saCheck.serviceAccountName}" (exit ${saCheck.exitCode})`,
          );
        }
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- poll for async post-deploy SA attach
        return cy.wait(5000).then(() => checkWiring());
      }

      return checkHfServiceAccountOwnerRefs(deploymentName, namespace, kind).then((ownerCheck) => {
        if (!ownerCheck.ok) {
          if (attempts >= DEFAULT_MAX_ATTEMPTS) {
            throw new Error(
              `HF ServiceAccount wiring incomplete for ${saName}: label=${ownerCheck.dashboardLabel} ownedByDeployment=${ownerCheck.ownedByDeployment}`,
            );
          }
          // eslint-disable-next-line cypress/no-unnecessary-waiting -- poll for SA ownerRef patch
          return cy.wait(5000).then(() => checkWiring());
        }

        return checkHfTokenSecretOwnerRefs(deploymentName, namespace, kind).then((secretCheck) => {
          if (!secretCheck.ok) {
            if (attempts >= DEFAULT_MAX_ATTEMPTS) {
              throw new Error(
                `HF Secret wiring incomplete for ${deploymentName}: no dashboard Secret with HF_TOKEN owned by ${kind}/${deploymentName} and referenced by SA ${saName}`,
              );
            }
            // eslint-disable-next-line cypress/no-unnecessary-waiting -- poll for Secret create/ownerRef
            return cy.wait(5000).then(() => checkWiring());
          }

          return verifyNoHfTokenContainerEnv(deploymentName, namespace, kind).then(() => {
            cy.log(
              `✓ HF ServiceAccount wiring verified: ${kind}/${deploymentName} → SA ${saName} → Secret ${secretCheck.secretName}`,
            );
            return cy.wrap(undefined);
          });
        });
      });
    });
  };

  return checkWiring();
};
