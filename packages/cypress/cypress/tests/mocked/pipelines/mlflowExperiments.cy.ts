// This override is needed because eslint seems to think that the expect() statements are not used.
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__';
import { mlflowExperimentsPage } from '../../../pages/pipelines/mlflowExperiments';

const MLFLOW_EXPERIMENTS_ROUTE = '/develop-train/experiments-mlflow';
const MLFLOW_PROXY_BASE_PATH = '/mlflow';
const MLFLOW_DEFAULT_PATH = '/experiments';
const MLFLOW_DEFAULT_IFRAME_SRC = `${MLFLOW_PROXY_BASE_PATH}/#${MLFLOW_DEFAULT_PATH}`;

function isIframeElement(element: HTMLElement | undefined): element is HTMLIFrameElement {
  return element?.tagName.toLowerCase() === 'iframe';
}

const initIntercepts = () => {
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
      embedMLflow: true,
    }),
  );
};

describe('MLflow Experiments', () => {
  it('should show the MLflow Experiments page and override css components', () => {
    initIntercepts();
    mlflowExperimentsPage.visit();
    mlflowExperimentsPage.findMlflowIframe().should('be.visible');
    mlflowExperimentsPage.findMlflowIframe().should('have.attr', 'src', MLFLOW_DEFAULT_IFRAME_SRC);
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
        expect(main?.style.margin).to.equal('0px');
        expect(main?.style.borderRadius).to.equal('0px');

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
    const testPath = `/workspaces/default/compare-runs?${runsParam}&${experimentsParam}`;

    mlflowExperimentsPage.visit(testPath);
    mlflowExperimentsPage.findMlflowIframe().should('have.attr', 'src', MLFLOW_DEFAULT_IFRAME_SRC);

    mlflowExperimentsPage.getMlflowPath().then((mlflowPath) => {
      const [pathname, queryString] = mlflowPath.split('?');
      expect(pathname).to.equal('/workspaces/default/compare-runs');

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

    const iframeHashPath =
      '/workspaces/default/experiments/1/runs?searchFilter=&orderByKey=tags.%60mlflow.runName%60&orderByAsc=true&startTime=ALL&lifecycleFilter=Active&modelVersionFilter=All+Runs&datasetsFilter=W10%3D';

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
        const [pathname, queryString] = mlflowPath.split('?');
        expect(pathname).to.equal('/workspaces/default/experiments/1/runs');

        const params = new URLSearchParams(queryString);
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
    const pathWithQuery = '/workspaces/default/compare-runs?runs=%5B%22abc%22%5D';
    mlflowExperimentsPage.visit(pathWithQuery);
    mlflowExperimentsPage.findMlflowIframe().should('be.visible');
    mlflowExperimentsPage.getMlflowPath().should('include', '/workspaces/default/compare-runs');
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
              iframeWindow.history.replaceState({}, '', '#/workspaces/default/experiments');
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
              iframeWindow.history.replaceState({}, '', '#/workspaces/default/experiments');
            }
          });

          cy.url().should('include', MLFLOW_EXPERIMENTS_ROUTE);
          mlflowExperimentsPage
            .getMlflowPath()
            .should('include', '/workspaces/default/experiments');

          cy.window()
            .its('history.length')
            .should('equal', initialLength + 1);
        });
      });
  });
});
