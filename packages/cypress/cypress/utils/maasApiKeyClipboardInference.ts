import { verifyMaaSModelInferencing } from './oc_commands/maas';

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
 * Prerequisites: {@link stubClipboardWriteTextForApiKeyModal}, copy click, and the same
 * `llmInferenceServiceName` the test captured from the deploy wizard (e.g. `resourceName` in the spec).
 */
export const verifyMaaSModelInferenceUsingCopiedApiKeyFromModal = (
  projectName: string,
  llmInferenceServiceName: string,
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
      cy.wrap(token).as('maasApiKeyToken');
      cy.step('Inference with the model using the API key');
      return verifyMaaSModelInferencing(llmInferenceServiceName, projectName, token).then(
        ({ response }) => {
          cy.log(`Response status: ${response.status}`);
          expect(response.status).to.equal(200);
          cy.log(`✅ Inference with the model using the API key successful`);
          cy.log(`✅ Response body: ${JSON.stringify(response.body)}`);
        },
      );
    });

/**
 * Asserts the model returns 403 using alias `maasApiKeyToken` (after the key was revoked in the UI).
 */
export const verifyMaaSModelInferenceUsingRevokedApiKey = (
  projectName: string,
  llmInferenceServiceName: string,
): Cypress.Chainable<MaaSModelInferencingResult> =>
  cy.get('@maasApiKeyToken').then((revokedToken) =>
    verifyMaaSModelInferencing(llmInferenceServiceName, projectName, String(revokedToken)).then(
      ({ response }) => {
        expect(response.status).to.equal(403);
        cy.log(`❌ Inference with the model using the revoked API key failed`);
        cy.log(`Response status: ${response.status}`);
        cy.log(`Response body: ${JSON.stringify(response.body)}`);
      },
    ),
  );
