import { EvalHubHealthResponse } from '~/app/types';

export const mockEvalHubHealth = (
  options: Partial<EvalHubHealthResponse> = {},
): EvalHubHealthResponse => ({
  status: options.status ?? 'healthy',
  available: options.available ?? true,
});
