import type { CreateAPIKeyRequest, CreateAPIKeyResponse } from '@odh-dashboard/maas/types/api-key';

/**
 * Matches ApiKeysTableRow.formatDate in packages/maas/frontend.
 * The UI always formats with en-US regardless of the runner locale.
 */
export const formatApiKeyDisplayDate = (date: Date): string =>
  date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

type CreateKeyRequest = { data: Pick<CreateAPIKeyRequest, 'expiresIn'> };
type CreateKeyResponse = { data: Pick<CreateAPIKeyResponse, 'createdAt' | 'expiresAt'> };

const createKeyAlias = 'createApiKeyForDateChecks';

const formatApiKeyDate = (timestamp: string | undefined, field: string): string => {
  const date = new Date(timestamp ?? '');
  expect(date.getTime(), `API key ${field} timestamp`).to.satisfy(Number.isFinite);
  return formatApiKeyDisplayDate(date);
};

// The one-time response includes the plaintext key, so suppress request and wait logging.
export const watchApiKeyCreation = (): Cypress.Chainable<null> =>
  cy
    .intercept({ method: 'POST', pathname: '**/maas/api/v1/api-keys', times: 1 }, { log: false })
    .as(createKeyAlias);

export const waitForApiKeyDates = (
  expiresIn: string,
): Cypress.Chainable<{ createdOn: string; expiresOn: string }> =>
  cy
    .wait<CreateKeyRequest, CreateKeyResponse>(`@${createKeyAlias}`, { log: false })
    .then(({ request, response }) => {
      expect(request.body.data.expiresIn, 'requested key expiration').to.equal(expiresIn);
      expect(response?.statusCode, 'API key creation status').to.equal(201);
      const { createdAt, expiresAt } = response?.body.data ?? {};

      return {
        createdOn: formatApiKeyDate(createdAt, 'creation'),
        expiresOn: formatApiKeyDate(expiresAt, 'expiration'),
      };
    });
