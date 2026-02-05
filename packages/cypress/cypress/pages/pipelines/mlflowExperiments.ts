/* eslint-disable @typescript-eslint/no-unused-expressions */
import { appChrome } from '../appChrome';

const MLFLOW_EXPERIMENTS_ROUTE = '/develop-train/experiments-mlflow';
const MLFLOW_DEFAULT_PATH = '/experiments';
const WORKSPACE_QUERY_PARAM = 'workspace';

type ClickModifiers = {
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  button?: number;
};

type WindowOpenTracker = {
  wasCalled: () => boolean;
  getUrl: () => string;
};

class MLflowExperimentsPage {
  visit(mlflowPath?: string, namespace?: string) {
    const ns = namespace || 'test-project';
    let url: string;
    if (mlflowPath) {
      const hasQuery = mlflowPath.includes('?');
      if (hasQuery) {
        url = `${MLFLOW_EXPERIMENTS_ROUTE}${mlflowPath}&${WORKSPACE_QUERY_PARAM}=${ns}`;
      } else {
        url = `${MLFLOW_EXPERIMENTS_ROUTE}${mlflowPath}?${WORKSPACE_QUERY_PARAM}=${ns}`;
      }
    } else {
      url = `${MLFLOW_EXPERIMENTS_ROUTE}${MLFLOW_DEFAULT_PATH}?${WORKSPACE_QUERY_PARAM}=${ns}`;
    }

    cy.visitWithLogin(url);
    this.wait();
  }

  private wait() {
    cy.findByTestId('mlflow-iframe');
    cy.testA11y();
  }

  findMlflowIframe() {
    return cy.findByTestId('mlflow-iframe');
  }

  getMlflowPath() {
    return cy.url().then((url) => {
      const urlObj = new URL(url);
      const { pathname, search } = urlObj;
      if (pathname.startsWith(MLFLOW_EXPERIMENTS_ROUTE)) {
        const mlflowPath = pathname.slice(MLFLOW_EXPERIMENTS_ROUTE.length) || MLFLOW_DEFAULT_PATH;
        return search ? `${mlflowPath}${search}` : mlflowPath;
      }
      return MLFLOW_DEFAULT_PATH;
    });
  }

  findNavItem() {
    return appChrome.findNavItem({
      name: 'Experiments (MLflow)',
      rootSection: 'Develop & train',
    });
  }

  findProjectSelect() {
    return cy.findByTestId('project-selector-toggle');
  }

  selectProjectByName(name: string) {
    this.findProjectSelect().click();
    cy.findByTestId('project-selector-search').fill(name);
    cy.findByTestId('project-selector-menuList')
      .contains('button', name)
      .should('be.visible')
      .click();
  }

  findEmptyState() {
    return cy.findByTestId('mlflow-no-projects-empty-state');
  }

  findLightThemeToggle() {
    return cy.findByTestId('light-theme-toggle');
  }

  findDarkThemeToggle() {
    return cy.findByTestId('dark-theme-toggle');
  }

  getWorkspace() {
    return cy.url().then((url) => {
      const urlObj = new URL(url);
      return urlObj.searchParams.get(WORKSPACE_QUERY_PARAM);
    });
  }

  isIframeElement(element: HTMLElement | undefined): element is HTMLIFrameElement {
    return element?.tagName.toLowerCase() === 'iframe';
  }

  setupWindowOpenStub(): WindowOpenTracker {
    let called = false;
    let url = '';

    cy.window().then((win) => {
      cy.stub(win, 'open').callsFake((openUrl: string) => {
        called = true;
        url = openUrl;
        return null;
      });
    });

    return {
      wasCalled: () => called,
      getUrl: () => url,
    };
  }

  clickLinkInIframe(iframe: HTMLIFrameElement, testId: string, modifiers: ClickModifiers = {}) {
    cy.wrap(iframe.contentDocument?.body)
      .findByTestId(testId)
      .then(($link) => {
        const link = $link[0] as HTMLAnchorElement;
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          view: iframe.contentWindow || undefined,
          ...modifiers,
        });
        link.dispatchEvent(clickEvent);
      });
  }

  withReadyIframe(callback: (iframe: HTMLIFrameElement) => void): void {
    this.findMlflowIframe().then(($iframe) => {
      const iframe = $iframe[0];
      if (!this.isIframeElement(iframe)) {
        throw new Error('Expected element to be an iframe');
      }
      cy.wrap(iframe).should(() => {
        expect(iframe.contentDocument).to.not.be.null;
        expect(iframe.contentDocument?.readyState).to.equal('complete');
      });
      callback(iframe);
    });
  }
}

export const mlflowExperimentsPage = new MLflowExperimentsPage();
