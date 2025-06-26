import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockLMEvaluation,
  mockProjectK8sResource,
} from '#~/__mocks__';
import { LMEvalModel, ProjectModel } from '#~/__tests__/cypress/cypress/utils/models';
import { lmEvalList } from '#~/__tests__/cypress/cypress/pages/lmEval/lmEvalList';
import { lmEvalPage } from '#~/__tests__/cypress/cypress/pages/lmEval/lmEvalPage';
import { be } from '#~/__tests__/cypress/cypress/utils/should';

const initIntercepts = (disableLMEval = false) => {
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableLMEval,
    }),
  );

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: 'test-project', displayName: 'Test Project' }),
    ]),
  );

  cy.interceptK8sList(
    { model: LMEvalModel, ns: 'test-project' },
    mockK8sResourceList([
      mockLMEvaluation({
        name: 'Evaluating granite model',
        state: 'Complete',
        modelArgs: [{ name: 'model', value: 'granite' }],
      }),
      mockLMEvaluation({
        name: 'Evaluating llama model',
        modelArgs: [{ name: 'model', value: 'llama' }],
      }),
    ]),
  );
};

describe('LMEvalList', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('list model evaluations and check table filtering and sorting', () => {
    lmEvalPage.visit('test-project');
    lmEvalPage.findPageTitle().should('have.text', 'Model evaluations');
    lmEvalList.getRow('Evaluating granite model').findModel().should('have.text', 'granite');

    lmEvalList.getRow('Evaluating llama model').findModel().should('have.text', 'llama');

    // sorting
    lmEvalList.findSortButton('Name').click();
    lmEvalList.findSortButton('Name').should(be.sortDescending);
    lmEvalList.findSortButton('Name').click();
    lmEvalList.findSortButton('Name').should(be.sortAscending);

    // filtering
    const toolbar = lmEvalList.getTableToolbar();
    toolbar.findFilterMenuOption('filter-toolbar-dropdown', 'Model').click();
    toolbar.findSearchInput().type('granite');
    lmEvalList.getRow('Evaluating granite model').findModel().should('have.text', 'granite');
  });

  it('check download json feature', () => {
    lmEvalPage.visit('test-project');
    lmEvalList.getRow('Evaluating granite model').findKebabAction('Download JSON').click();
    cy.readFile('cypress/downloads/Evaluating granite model.json').should('exist');
  });
});
