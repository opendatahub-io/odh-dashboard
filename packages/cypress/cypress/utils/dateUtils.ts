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

export const parseExpirationDays = (expirationId: string): number =>
  parseInt(expirationId.replace(/\D/g, ''), 10);

export const formatApiKeyExpirationDate = (expirationId: string, from = new Date()): string => {
  const expiry = new Date(from);
  expiry.setDate(expiry.getDate() + parseExpirationDays(expirationId));
  return formatApiKeyDisplayDate(expiry);
};
