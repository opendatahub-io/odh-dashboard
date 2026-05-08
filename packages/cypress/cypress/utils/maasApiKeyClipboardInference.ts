import {
  verifyMaaSModelInferencing,
  type VerifyMaaSModelInferencingOptions,
} from './oc_commands/maas';

const CLIPBOARD_WRITE_STUB_ALIAS = 'clipboardWrite';

type MaaSModelInferencingResult = { url: string; response: Cypress.Response<unknown> };

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
