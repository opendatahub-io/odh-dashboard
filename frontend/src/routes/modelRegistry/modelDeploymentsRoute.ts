import { modelVersionRoute } from "./modelVersionsRoute";

export const modelVersionDeploymentsRoute = (
    mvId: string,
    rmId?: string,
    preferredModelRegistry?: string,
  ): string => `${modelVersionRoute(mvId, rmId, preferredModelRegistry)}/deployments`;