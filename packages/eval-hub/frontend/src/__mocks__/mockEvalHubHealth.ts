import { EvalHubHealthResponse } from '~/app/types';

type MockEvalHubHealthOptions = Partial<{
  status: string;
  available: boolean;
}>;

export const mockEvalHubHealth = (
  options: MockEvalHubHealthOptions = {},
): EvalHubHealthResponse => ({
  status: options.status ?? 'healthy',
  available: options.available ?? true,
});
