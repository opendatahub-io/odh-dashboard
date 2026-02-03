// This override is needed because eslint seems to think that the expect() statements are not used.
/* eslint-disable @typescript-eslint/no-unused-expressions */
import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockProjectK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import { mlflowExperimentsPage } from '../../../pages/pipelines/mlflowExperiments';
import { ProjectModel } from '../../../utils/models';

const MLFLOW_EXPERIMENTS_ROUTE = '/develop-train/experiments-mlflow';
const MLFLOW_PROXY_BASE_PATH = '/mlflow';
const TEST_PROJECT_NAME = 'test-project';
const TEST_PROJECT_NAME_2 = 'test-project-2';
const MLFLOW_WORKSPACE_IFRAME_SRC = `${MLFLOW_PROXY_BASE_PATH}/#/experiments?workspace=${TEST_PROJECT_NAME}`;

function isIframeElement(element: HTMLElement | undefined): element is HTMLIFrameElement {
  return element?.tagName.toLowerCase() === 'iframe';
}

type InitInterceptsOptions = {
  hasMultipleProjects?: boolean;
  hasNoProjects?: boolean;
};

const initIntercepts = (options: InitInterceptsOptions = {}) => {
  const { hasMultipleProjects = false, hasNoProjects = false } = options;
  cy.intercept('GET', `${MLFLOW_PROXY_BASE_PATH}/**`, {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
    },
    body: `
      <html>
        <head>
          <title>MLflow Experiments</title>
        </head>
        <body>
          <div class="du-bois-light-breadcrumb">Breadcrumb to be removed</div>
          <header>Header to be removed</header>
          <aside>Sidebar to be removed</aside>
          <main style="margin: 20px; border-radius: 8px;">
            <div id="mlflow-experiments-page">
              <h1>MLflow Experiments</h1>
              <div>Test content for MLflow experiments</div>
            </div>
          </main>
        </body>
      </html>
    `,
  }).as('mlflowIframe');

  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      mlflow: true,
    }),
  );

  if (hasNoProjects) {
    cy.interceptK8sList(ProjectModel, mockK8sResourceList([]));
  } else if (hasMultipleProjects) {
    cy.interceptK8sList(
      ProjectModel,
      mockK8sResourceList([
        mockProjectK8sResource({ k8sName: TEST_PROJECT_NAME, displayName: 'Test Project' }),
        mockProjectK8sResource({ k8sName: TEST_PROJECT_NAME_2, displayName: 'Test Project 2' }),
      ]),
    );
  } else {
    cy.interceptK8sList(
      ProjectModel,
      mockK8sResourceList([
        mockProjectK8sResource({ k8sName: TEST_PROJECT_NAME, displayName: 'Test Project' }),
      ]),
    );
  }
};

describe('MLflow Experiments', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('mlflow jump link exists', () => {
    mlflowExperimentsPage.visit();
    mlflowExperimentsPage.findMlflowJumpLink().should('be.visible');
    mlflowExperimentsPage.findMlflowJumpLink().should('have.attr', 'href', MLFLOW_PROXY_BASE_PATH);
  });

  it('should show the MLflow Experiments page and override css components', () => {
    mlflowExperimentsPage.visit();
    mlflowExperimentsPage.findMlflowIframe().should('be.visible');
    mlflowExperimentsPage
      .findMlflowIframe()
      .should('have.attr', 'src', MLFLOW_WORKSPACE_IFRAME_SRC);
    cy.wait('@mlflowIframe');

    mlflowExperimentsPage.findMlflowIframe().then(($iframe) => {
      const iframe = $iframe[0];

      if (!isIframeElement(iframe)) {
        throw new Error('Expected element to be an iframe');
      }

      cy.wrap(iframe).should(() => {
        expect(iframe.contentDocument).to.not.be.null;
        expect(iframe.contentDocument?.readyState).to.equal('complete');
      });

      cy.wrap(iframe).should(() => {
        const doc = iframe.contentDocument;
        expect(doc).to.not.be.null;

        expect(doc?.querySelector('.du-bois-light-breadcrumb')).to.have.css('display', 'none');
        expect(doc?.querySelector('header')).to.have.css('display', 'none');
        expect(doc?.querySelector('aside')).to.have.css('display', 'none');

        const main = doc?.querySelector('main');
        expect(main).to.not.be.null;
        if (main) {
          const computedStyle = iframe.contentWindow?.getComputedStyle(main);
          expect(computedStyle?.margin).to.equal('0px');
          expect(computedStyle?.borderRadius).to.equal('0px');
        }

        expect(doc?.querySelector('#mlflow-experiments-page')).to.not.be.null;
      });
    });
  });

  it('should load the correct iframe page from parent URL', () => {
    initIntercepts();
    const runIds = [
      '02a652600cce4bb4b820d5a1717712f3',
      'e41bdeb677d848d6a5c7247c4aca4a2f',
      '5b888e189e5e44f4abfdeb6173b7b1aa',
      '86dd7c87b3f24b89b8f72cf1698c4c8c',
    ];
    const experimentId = '1';
    const runsParam = `runs=${encodeURIComponent(JSON.stringify(runIds))}`;
    const experimentsParam = `experiments=${encodeURIComponent(JSON.stringify([experimentId]))}`;
    const testPath = `/compare-runs?${runsParam}&${experimentsParam}`;

    mlflowExperimentsPage.visit(testPath);
    mlflowExperimentsPage
      .findMlflowIframe()
      .should('have.attr', 'src', MLFLOW_WORKSPACE_IFRAME_SRC);

    mlflowExperimentsPage.getMlflowPath().then((mlflowPath) => {
      expect(mlflowPath).to.include('/compare-runs');
      expect(mlflowPath).to.include(`workspace=${TEST_PROJECT_NAME}`);

      const queryStart = mlflowPath.indexOf('?');
      const queryString = mlflowPath.slice(queryStart + 1);
      const params = new URLSearchParams(queryString);
      const actualRuns = JSON.parse(params.get('runs') || '[]');
      const actualExperiments = JSON.parse(params.get('experiments') || '[]');
      expect(actualRuns).to.deep.equal(runIds);
      expect(actualExperiments).to.deep.equal([experimentId]);
    });
  });

  it('should sync parent URL when iframe navigates', () => {
    initIntercepts();
    mlflowExperimentsPage.visit();
    cy.wait('@mlflowIframe');

    const iframeHashPath = `/experiments/1/runs?workspace=${TEST_PROJECT_NAME}&searchFilter=&orderByKey=tags.%60mlflow.runName%60&orderByAsc=true&startTime=ALL&lifecycleFilter=Active&modelVersionFilter=All+Runs&datasetsFilter=W10%3D`;

    mlflowExperimentsPage.findMlflowIframe().then(($iframe) => {
      const iframe = $iframe[0];
      if (!isIframeElement(iframe)) {
        throw new Error('Expected element to be an iframe');
      }
      cy.wrap(iframe).should(() => {
        expect(iframe.contentWindow).to.not.be.null;
        const iframeWindow = iframe.contentWindow;
        if (iframeWindow) {
          iframeWindow.history.pushState({}, '', `#${iframeHashPath}`);
        }
      });
      mlflowExperimentsPage.getMlflowPath().then((mlflowPath) => {
        expect(mlflowPath).to.include('/experiments/1/runs');

        const queryStart = mlflowPath.indexOf('?');
        const queryString = mlflowPath.slice(queryStart + 1);
        const params = new URLSearchParams(queryString);
        expect(params.get('workspace')).to.equal(TEST_PROJECT_NAME);
        expect(params.get('searchFilter')).to.equal('');
        expect(params.get('orderByKey')).to.equal('tags.`mlflow.runName`');
        expect(params.get('orderByAsc')).to.equal('true');
        expect(params.get('startTime')).to.equal('ALL');
        expect(params.get('lifecycleFilter')).to.equal('Active');
        expect(params.get('modelVersionFilter')).to.equal('All Runs');
        expect(params.get('datasetsFilter')).to.equal('W10=');
      });
    });
  });

  it('should handle URL encoding differences correctly', () => {
    initIntercepts();
    const pathWithQuery = `/compare-runs?runs=%5B%22abc%22%5D`;
    mlflowExperimentsPage.visit(pathWithQuery);
    mlflowExperimentsPage.findMlflowIframe().should('be.visible');
    mlflowExperimentsPage.getMlflowPath().should('include', `/compare-runs`);
    mlflowExperimentsPage.getWorkspace().should('equal', TEST_PROJECT_NAME);
  });

  it('should not create duplicate history entries on internal redirects', () => {
    initIntercepts();
    mlflowExperimentsPage.visit();
    cy.wait('@mlflowIframe');

    cy.window()
      .its('history.length')
      .then((initialLength) => {
        mlflowExperimentsPage.findMlflowIframe().then(($iframe) => {
          const iframe = $iframe[0];
          if (!isIframeElement(iframe)) {
            throw new Error('Expected element to be an iframe');
          }
          cy.wrap(iframe).should(() => {
            expect(iframe.contentWindow).to.not.be.null;
          });
          cy.wrap(iframe).then(() => {
            const iframeWindow = iframe.contentWindow;
            if (iframeWindow) {
              // New format: workspace in query params
              iframeWindow.history.replaceState(
                {},
                '',
                `#/experiments?workspace=${TEST_PROJECT_NAME}`,
              );
            }
          });
          cy.window().its('history.length').should('equal', initialLength);
        });
      });
  });

  it('should add only one history entry when clicking navbar including the iframe redirect', () => {
    // Simulating mlflow internal redirect from /experiments
    // to /workspaces/default/experiments i.e. a workspace's experiments page
    initIntercepts();
    cy.visitWithLogin('/');
    cy.window()
      .its('history.length')
      .then((initialLength) => {
        mlflowExperimentsPage.findNavItem().click();
        mlflowExperimentsPage.findMlflowIframe().should('be.visible');
        cy.wait('@mlflowIframe');
        mlflowExperimentsPage.findMlflowIframe().then(($iframe) => {
          const iframe = $iframe[0];
          if (!isIframeElement(iframe)) {
            throw new Error('Expected element to be an iframe');
          }

          cy.wrap(iframe).then(() => {
            const iframeWindow = iframe.contentWindow;
            if (iframeWindow) {
              iframeWindow.history.replaceState(
                {},
                '',
                `#/experiments?workspace=${TEST_PROJECT_NAME}`,
              );
            }
          });

          cy.url().should('include', `${MLFLOW_EXPERIMENTS_ROUTE}/experiments`);
          cy.url().should('include', `workspace=${TEST_PROJECT_NAME}`);
          mlflowExperimentsPage.getMlflowPath().should('include', `/experiments`);
          mlflowExperimentsPage.getWorkspace().should('equal', TEST_PROJECT_NAME);

          cy.window()
            .its('history.length')
            .should('equal', initialLength + 1);
        });
      });
  });

  it('should display the project selector', () => {
    initIntercepts();
    mlflowExperimentsPage.visit();
    mlflowExperimentsPage.findProjectSelect().should('be.visible');
    mlflowExperimentsPage.findProjectSelect().should('contain.text', 'Test Project');
  });

  it('should select a different project and navigate to the new workspace', () => {
    initIntercepts({ hasMultipleProjects: true });
    mlflowExperimentsPage.visit();
    cy.url().should('include', `${MLFLOW_EXPERIMENTS_ROUTE}/experiments`);
    cy.url().should('include', `workspace=${TEST_PROJECT_NAME}`);

    mlflowExperimentsPage.selectProjectByName('Test Project 2');
    cy.url().should('include', `${MLFLOW_EXPERIMENTS_ROUTE}/experiments`);
    cy.url().should('include', `workspace=${TEST_PROJECT_NAME_2}`);
    mlflowExperimentsPage.findMlflowIframe().should('be.visible');
  });

  it('should show an empty state when no projects exist', () => {
    initIntercepts({ hasNoProjects: true });
    cy.visitWithLogin(`${MLFLOW_EXPERIMENTS_ROUTE}`);
    mlflowExperimentsPage.findEmptyState().should('be.visible');
    mlflowExperimentsPage.findEmptyState().should('contain.text', 'No projects');
  });

  it('should redirect to workspace URL when visiting base route', () => {
    initIntercepts();
    cy.visitWithLogin(`${MLFLOW_EXPERIMENTS_ROUTE}`);
    cy.url().should('include', `${MLFLOW_EXPERIMENTS_ROUTE}/experiments`);
    cy.url().should('include', `workspace=${TEST_PROJECT_NAME}`);
    mlflowExperimentsPage.findMlflowIframe().should('be.visible');
  });

  it('should toggle theme between light and dark', () => {
    initIntercepts();
    mlflowExperimentsPage.visit();
    mlflowExperimentsPage.findDarkThemeToggle().click();
    cy.window().then((win) => {
      expect(win.localStorage.getItem('_mlflow_dark_mode_toggle_enabled')).to.equal('true');
      expect(win.localStorage.getItem('odh.dashboard.ui.theme')).to.equal('"dark"');
    });
    mlflowExperimentsPage.findLightThemeToggle().click();
    cy.window().then((win) => {
      expect(win.localStorage.getItem('_mlflow_dark_mode_toggle_enabled')).to.equal('false');
      expect(win.localStorage.getItem('odh.dashboard.ui.theme')).to.equal('"light"');
    });
  });
});
