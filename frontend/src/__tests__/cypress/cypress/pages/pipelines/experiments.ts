/* eslint-disable camelcase */

import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';

class ExperimentsTabs {
  visit(namespace?: string, tab?: string) {
    cy.visitWithLogin(`/experiments${namespace ? `/${namespace}` : ''}${tab ? `/${tab}` : ''}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('experiments-global-tabs');
    cy.testA11y();
  }

  findActiveTab() {
    return cy.findByTestId('experiments-active-tab');
  }

  findArchivedTab() {
    return cy.findByTestId('experiments-archived-tab');
  }

  getActiveExperimentsTable() {
    return new ExperimentsTable(() => cy.findByTestId('experiments-active-tab-content'));
  }

  getArchivedExperimentsTable() {
    return new ExperimentsTable(() => cy.findByTestId('experiments-archived-tab-content'));
  }

  mockGetExperiments(
    activeExperiments: ExperimentKFv2[],
    archivedExperiments: ExperimentKFv2[] = [],
  ) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v2beta1/experiments',
      },
      (req) => {
        const { predicates } = JSON.parse(req.body.queryParams.filter);

        if (predicates.length === 0) {
          req.reply({ experiments: activeExperiments, total_size: activeExperiments.length });
        } else {
          const [{ string_value: experimentState }] = predicates;
          if (experimentState === 'ARCHIVED') {
            req.reply({ experiments: archivedExperiments, total_size: archivedExperiments.length });
          } else {
            req.reply({ experiments: activeExperiments, total_size: activeExperiments.length });
          }
        }
      },
    );
  }
}

class ExperimentsTable {
  private findContainer: () => Cypress.Chainable<JQuery<HTMLElement>>;

  constructor(findContainer: () => Cypress.Chainable<JQuery<HTMLElement>>) {
    this.findContainer = findContainer;
  }

  mockArchiveExperiment(experimentId: string) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v2beta1/experiments/${experimentId}:archive`,
      },
      (req) => {
        req.reply({ body: {} });
      },
    );
  }

  mockRestoreExperiment(experimentId: string) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v2beta1/experiments/${experimentId}:unarchive`,
      },
      (req) => {
        req.reply({ body: {} });
      },
    );
  }

  shouldRowNotBeVisible(name: string) {
    return this.find().get('tr').contains(name).should('not.be.visible');
  }

  find() {
    return this.findContainer().findByTestId('experiment-table');
  }

  findRowByName(name: string) {
    return this.find().findAllByRole('cell', { name }).parents('tr');
  }

  findRows() {
    return this.find().find('[data-label=Experiment]').parents('tr');
  }

  findRowKebabByName(name: string) {
    return this.findRowByName(name).findByRole('button', { name: 'Kebab toggle' });
  }

  findActionsKebab() {
    return cy.findByRole('button', { name: 'Actions' }).parent();
  }

  findRestoreExperimentButton() {
    return cy.findByRole('button', { name: 'Restore' });
  }

  findEmptyState() {
    return this.findContainer().findByTestId('global-no-experiments');
  }

  selectFilterByName(name: string) {
    this.findContainer()
      .findByTestId('experiment-table-toolbar')
      .findByTestId('pipeline-filter-dropdown')
      .findDropdownItem(name)
      .click();
  }

  findFilterTextField() {
    return this.findContainer()
      .findByTestId('experiment-table-toolbar')
      .findByTestId('run-table-toolbar-filter-text-field');
  }

  selectRowActionByName(rowName: string, actionName: string) {
    this.findRowKebabByName(rowName).click();
    this.findContainer()
      .findByRole('menu')
      .get('span')
      .contains(actionName)
      .parents('button')
      .click();
  }
}

export const experimentsTabs = new ExperimentsTabs();
