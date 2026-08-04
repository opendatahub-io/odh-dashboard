import {
  verifyMaaSModelInferencing,
  type VerifyMaaSModelInferencingOptions,
  ListMaaSModels,
} from './oc_commands/maas';

const CLIPBOARD_WRITE_STUB_ALIAS = 'clipboardWrite';
type MaaSModelInferencingResult = { url: string; response: Cypress.Response<unknown> };
const MAAS_MODELS_LIST_MAX_ATTEMPTS = 7;

const isModelInList = (models: { id: string }[], modelName: string): boolean =>
  models.some((model) => model.id === modelName || model.id.endsWith(`/models/${modelName}`));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseMaaSModelsListResponse = (body: unknown): { id: string }[] => {
  if (!isRecord(body)) {
    throw new Error('MaaS /v1/models response body is not an object');
  }
  const { data } = body;
  if (!Array.isArray(data)) {
    throw new Error('MaaS /v1/models response is missing a data array');
  }
  data.forEach((model, index) => {
    if (!isRecord(model) || typeof model.id !== 'string') {
      throw new Error(`MaaS /v1/models entry at index ${index} is missing id`);
    }
  });
  return data as { id: string }[];
};

/**
 * Stubs `navigator.clipboard.writeText` with a stub aliased as `clipboardWrite`.
 * Call after the dialog is open and before clicking the copy button.
 */
export const stubClipboardWriteTextForApiKeyModal = (): void => {
  cy.window().then((win) => {
    cy.stub(win.navigator.clipboard, 'writeText').as(CLIPBOARD_WRITE_STUB_ALIAS);
  });
};

/**
 * After the copy button was clicked: reads the token from the stub, aliases it as
 * `maasApiKeyToken`, and asserts completions return 200.
 *
 * @param getLlmInferenceServiceName Return the LLMInferenceService `metadata.name` from the deploy wizard
 * (e.g. `() => resourceName`). Must be a **getter** so the name is read when this chain runs, not when the
 * spec is first parsed — otherwise it is still `undefined` before the wizard's `.then` has executed.
 * @param inferenceOptions Optional `maxAttempts` / `retryIntervalMs` for the MaaS `/v1/completions` POST (transient HTTP errors).
 */
export const verifyMaaSModelInferenceUsingCopiedApiKeyFromModal = (
  projectName: string,
  getLlmInferenceServiceName: () => string,
  inferenceOptions: VerifyMaaSModelInferencingOptions = {},
): Cypress.Chainable<MaaSModelInferencingResult> =>
  cy
    .get(`@${CLIPBOARD_WRITE_STUB_ALIAS}`)
    .should('have.been.calledOnce')
    .invoke('getCall', 0)
    .its('args.0')
    .should('be.a', 'string')
    .and('not.be.empty')
    .then((raw) => {
      const token = String(raw).trim();
      const llmInferenceServiceName = getLlmInferenceServiceName().trim();
      return cy
        .wrap(token)
        .as('maasApiKeyToken')
        .then(() => cy.step('Inference with the model using the API key'))
        .then(() =>
          verifyMaaSModelInferencing(llmInferenceServiceName, projectName, token, inferenceOptions),
        )
        .then((result) => {
          const { response } = result;
          expect(response.status).to.equal(200);
          return cy
            .log(`Response status: ${response.status}`)
            .log(`✅ Inference with the model using the copied API key successful`)
            .log(`✅ Response body: ${JSON.stringify(response.body)}`)
            .then(() => result);
        });
    });

/**
 * Asserts the model returns 403 using alias `maasApiKeyToken` (after the key was revoked in the UI).
 *
 * @param getLlmInferenceServiceName Same deferred getter as {@link verifyMaaSModelInferenceUsingCopiedApiKeyFromModal}.
 * @param inferenceOptions Optional `maxAttempts` / `retryIntervalMs` for the MaaS `/v1/completions` POST (e.g. 503 while gateway catches up; 403 is not retried).
 */
export const verifyMaaSModelInferenceUsingRevokedApiKey = (
  projectName: string,
  getLlmInferenceServiceName: () => string,
  inferenceOptions: VerifyMaaSModelInferencingOptions = {},
): Cypress.Chainable<MaaSModelInferencingResult> =>
  cy.get('@maasApiKeyToken').then((revokedToken) => {
    const llmInferenceServiceName = getLlmInferenceServiceName().trim();
    return verifyMaaSModelInferencing(
      llmInferenceServiceName,
      projectName,
      String(revokedToken),
      inferenceOptions,
    ).then((result) => {
      const { response } = result;
      expect(response.status).to.equal(403);
      return cy
        .log(`Response status: ${response.status}`)
        .log(`❌ Inference with the model using the revoked API key failed`)
        .log(`❌ Response body: ${JSON.stringify(response.body)}`)
        .then(() => result);
    });
  });

export const verifyMaasModelExistsForUser = (
  modelName: string,
  token: string,
  expectExists = true,
): void => {
  const makeRequest = (attemptNumber = 1): void => {
    ListMaaSModels(token).then((result) => {
      const { response } = result;

      expect(
        response.status,
        `MaaS /v1/models request failed (${response.status}): ${JSON.stringify(response.body)}`,
      ).to.equal(200);

      const models = parseMaaSModelsListResponse(response.body);
      const modelFound = isModelInList(models, modelName);

      if (expectExists) {
        if (!modelFound && attemptNumber < MAAS_MODELS_LIST_MAX_ATTEMPTS) {
          cy.log(`Model ${modelName} not found, retrying...`);
          return cy.then(() => makeRequest(attemptNumber + 1));
        }
        expect(modelFound, `Model ${modelName} should exist in models list`).to.equal(true);
        cy.log(`✅ Model ${modelName} exists for user`);
        return undefined;
      }

      if (modelFound && attemptNumber < MAAS_MODELS_LIST_MAX_ATTEMPTS) {
        cy.log(`Model ${modelName} found but should not exist, retrying...`);
        return cy.then(() => makeRequest(attemptNumber + 1));
      }
      expect(modelFound, `Model ${modelName} should NOT exist in models list`).to.equal(false);
      cy.log(`✅ Model ${modelName} does not exist for user`);
      return undefined;
    });
  };

  makeRequest();
};
