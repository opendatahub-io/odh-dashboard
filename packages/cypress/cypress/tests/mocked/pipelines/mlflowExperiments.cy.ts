// This override is needed because eslint seems to think that the expect() statements are not used.
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { mockDashboardConfig } from '@odh-dashboard/internal/__mocks__';
import { mlflowExperimentsPage } from '../../../pages/pipelines/mlflowExperiments';

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
      embedMLflow: true,
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

  it('should properly encode and decode MLflow paths in parent URL', () => {
    initIntercepts();
    const testPath = '/experiments/123/runs';
    const encodedPath = encodeURIComponent(testPath);
    mlflowExperimentsPage.visit(testPath);
    mlflowExperimentsPage.findMlflowIframe().should('have.attr', 'src', `/mlflow/#${testPath}`);
    mlflowExperimentsPage.getEncodedPathParam().should('equal', encodedPath);
    mlflowExperimentsPage.getPathParam().should('equal', testPath);
  });

  it('should sync parent URL when iframe navigates internally', () => {
    initIntercepts();
    mlflowExperimentsPage.visit();
    cy.wait('@mlflowIframe');

    mlflowExperimentsPage.findMlflowIframe().then(($iframe) => {
      const iframe = $iframe[0];
      if (!isIframeElement(iframe)) {
        throw new Error('Expected element to be an iframe');
      }
      cy.window().then((win) => {
        const initialLength = win.history.length;
        cy.wrap(iframe).should(() => {
          expect(iframe.contentWindow).to.not.be.null;
          iframe.contentWindow?.history.pushState({}, '', '#/experiments/3/runs');
        });
        cy.url().should('include', 'path=');
        mlflowExperimentsPage.getPathParam().should('equal', '/experiments/3/runs');

        cy.wrap(iframe).should(() => {
          iframe.contentWindow?.history.replaceState(
            {},
            '',
            '#/experiments/3/runs/11d8a63b60df4a3fa17d4ebbc8a5110c/artifacts',
          );
        });
        mlflowExperimentsPage
          .getPathParam()
          .should('equal', '/experiments/3/runs/11d8a63b60df4a3fa17d4ebbc8a5110c/artifacts');

        cy.wrap(iframe).should(() => {
          iframe.contentWindow?.history.pushState({}, '', '#/experiments');
        });
        cy.url().should('not.include', 'path=');
        cy.window().should((w) => {
          expect(w.history.length).to.be.at.most(initialLength + 1);
        });
      });
    });
  });

  it('should sync iframe content with parent URL changes', () => {
    initIntercepts();
    const deepPath = '/experiments/2/runs/11d8a63b60df4a3fa17d4ebbc8a5110c';
    mlflowExperimentsPage.visit(deepPath);
    mlflowExperimentsPage.findMlflowIframe().should('have.attr', 'src', `/mlflow/#${deepPath}`);
    mlflowExperimentsPage.visit();
    mlflowExperimentsPage.findMlflowIframe().should('have.attr', 'src', mlflowIframeUrl);
  });

  it('should handle navbar clicks with replaceWhenActive behavior', () => {
    initIntercepts();
    mlflowExperimentsPage.visit();
    cy.wait('@mlflowIframe');

    mlflowExperimentsPage.findMlflowIframe().then(($iframe) => {
      const iframe = $iframe[0];
      if (!isIframeElement(iframe)) {
        throw new Error('Expected element to be an iframe');
      }

      cy.wrap(iframe).should(() => {
        iframe.contentWindow?.history.pushState({}, '', '#/experiments/3/runs');
      });

      cy.url().should('include', 'path=');

      cy.window().then((win) => {
        const historyLengthBefore = win.history.length;

        mlflowExperimentsPage.findNavItem().click();

        cy.window().should((w) => {
          expect(w.history.length).to.equal(historyLengthBefore);
        });
        cy.url().should('not.include', 'path=');
        mlflowExperimentsPage.findMlflowIframe().should('have.attr', 'src', mlflowIframeUrl);
      });
    });
  });

  it('should isolate iframe history from browser history', () => {
    initIntercepts();
    mlflowExperimentsPage.visit();
    cy.wait('@mlflowIframe');

    cy.window().then((win) => {
      const initialLength = win.history.length;

      mlflowExperimentsPage.findMlflowIframe().then(($iframe) => {
        const iframe = $iframe[0];
        if (!isIframeElement(iframe)) {
          throw new Error('Expected element to be an iframe');
        }

        cy.wrap(iframe).should(() => {
          iframe.contentWindow?.history.pushState({}, '', '#/experiments/1');
          iframe.contentWindow?.history.pushState({}, '', '#/experiments/2');
          iframe.contentWindow?.history.pushState({}, '', '#/experiments/3');
          iframe.contentWindow?.history.pushState({}, '', '#/experiments/4/runs');
          iframe.contentWindow?.history.pushState(
            {},
            '',
            '#/experiments/5/runs/11d8a63b60df4a3fa17d4ebbc8a5110c/artifacts',
          );
        });

        // History length should not have increased significantly
        // (pushState converted to replaceState in patchIframeHistory)
        cy.window().should((w) => {
          expect(w.history.length).to.be.at.most(initialLength + 1);
        });

        mlflowExperimentsPage
          .getPathParam()
          .should('equal', '/experiments/5/runs/11d8a63b60df4a3fa17d4ebbc8a5110c/artifacts');
      });
    });
  });
});
