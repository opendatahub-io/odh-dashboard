const HF_API_KEY_ENV = 'HF_API_KEY';

export const requireHuggingFaceApiKey = (): string => {
  const apiKey = Cypress.env(HF_API_KEY_ENV) as string | undefined;
  if (!apiKey) {
    throw new Error(
      `${HF_API_KEY_ENV} is not set in test-variables.yml — required for Hugging Face catalog source E2E tests`,
    );
  }
  return apiKey;
};
export const generateSourceIdFromName = (name: string): string =>
  name
    .trim()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase();
