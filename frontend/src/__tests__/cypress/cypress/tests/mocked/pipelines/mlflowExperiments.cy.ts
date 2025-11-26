// This override is needed because eslint seems to think that the expect() statements are not used.
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { mlflowExperimentsPage } from '#~/__tests__/cypress/cypress/pages/pipelines/mlflowExperiments';
import { mockDashboardConfig } from '#~/__mocks__';

const mlflowIframeUrl = '/mlflow/#/experiments';

function isIframeElement(element: HTMLElement | undefined): element is HTMLIFrameElement {
  return element?.tagName.toLowerCase() === 'iframe';
}

const initIntercepts = () => {
  cy.intercept('GET', '/mlflow/**', {
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
};

describe('MLflow Experiments', () => {
  it('should show the MLflow Experiments page and override css components', () => {
    initIntercepts();
    mlflowExperimentsPage.visit();
    mlflowExperimentsPage.findMlflowIframe().should('be.visible');
    mlflowExperimentsPage.findMlflowIframe().should('have.attr', 'src', mlflowIframeUrl);
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

        expect(doc?.querySelector('.du-bois-light-breadcrumb')).to.be.null;
        expect(doc?.querySelector('header')).to.be.null;
        expect(doc?.querySelector('aside')).to.be.null;

        const main = doc?.querySelector('main');
        expect(main).to.not.be.null;
        expect(main?.style.margin).to.equal('0px');
        expect(main?.style.borderRadius).to.equal('0px');

        expect(doc?.querySelector('#mlflow-experiments-page')).to.not.be.null;
      });
    });
  });
});
