import { URL_PREFIX } from '~/app/utilities/const';

/** Browser route for the read-only Model Access page (MaaS Portal). */
export const MODEL_ACCESS_PATH = `${URL_PREFIX}/model-access`;

export const getModelAccessSubscriptionViewUrl = (name: string): string =>
  `${MODEL_ACCESS_PATH}/view/${encodeURIComponent(name)}`;
