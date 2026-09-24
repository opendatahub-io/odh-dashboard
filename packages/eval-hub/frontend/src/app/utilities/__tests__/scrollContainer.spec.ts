import { DeploymentMode } from 'mod-arch-core';
import {
  EVAL_HUB_STANDALONE_MAIN_CONTAINER_ID,
  getEvalHubScrollContainer,
} from '~/app/utilities/scrollContainer';

jest.mock('@odh-dashboard/internal/utilities/const', () => ({
  DASHBOARD_SCROLL_CONTAINER_SELECTOR: '#dashboard-scroll-container',
}));

describe('getEvalHubScrollContainer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('returns the page main container parent in standalone mode', () => {
    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'pf-v6-c-page__main-container';

    const main = document.createElement('main');
    main.id = EVAL_HUB_STANDALONE_MAIN_CONTAINER_ID;
    scrollContainer.appendChild(main);
    document.body.appendChild(scrollContainer);

    expect(getEvalHubScrollContainer(DeploymentMode.Standalone)).toBe(scrollContainer);
  });

  it('returns the dashboard drawer content in federated mode', () => {
    const scrollContainer = document.createElement('div');
    scrollContainer.id = 'dashboard-scroll-container';
    document.body.appendChild(scrollContainer);

    expect(getEvalHubScrollContainer(DeploymentMode.Federated)).toBe(scrollContainer);
  });
});
