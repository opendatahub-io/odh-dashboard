import { DeploymentMode } from 'mod-arch-core';
import { DASHBOARD_SCROLL_CONTAINER_SELECTOR } from '@odh-dashboard/internal/utilities/const';

export const EVAL_HUB_STANDALONE_MAIN_CONTAINER_ID = 'primary-app-container';

export const getEvalHubScrollContainer = (deploymentMode: DeploymentMode): HTMLElement => {
  if (deploymentMode === DeploymentMode.Standalone) {
    const main = document.getElementById(EVAL_HUB_STANDALONE_MAIN_CONTAINER_ID);
    if (main?.parentElement instanceof HTMLElement) {
      return main.parentElement;
    }
    return main ?? document.body;
  }

  const federatedContainer = document.querySelector(DASHBOARD_SCROLL_CONTAINER_SELECTOR);
  if (federatedContainer instanceof HTMLElement) {
    return federatedContainer;
  }

  return document.body;
};
