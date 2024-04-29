/* eslint-disable camelcase */

import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';
import { TableRow } from '~/__tests__/cypress/cypress/pages/components/table';

class ExperimentsTabs {
  visit(namespace?: string, tab?: string) {
    cy.visit(`/experiments${namespace ? `/${namespace}` : ''}${tab ? `/${tab}` : ''}`);
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

  getActiveExperimentsTable(): ExperimentsTable {
    return new ExperimentsTable(() => cy.findByTestId('experiments-active-tab-content'));
  }

  getArchivedExperimentsTable() {
    return new ExperimentsTable(() => cy.findByTestId('experiments-archived-tab-content'));
  }

  mockGetExperiments(
    namespace: string,
    activeExperiments: ExperimentKFv2[],
    archivedExperiments: ExperimentKFv2[] = [],
  ) {
    return cy.intercept(
      {
        method: 'GET',
        pathname: `/api/service/pipelines/${namespace}/dspa/apis/v2beta1/experiments`,
      },
      (req) => {
        const { predicates } = JSON.parse(req.query.filter.toString());

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

class ExperimentsRow extends TableRow {
  findCheckbox() {
    return this.find().find(`[data-label=Checkbox]`).find('input');
  }
}

class ExperimentsTable {
  private findContainer: () => Cypress.Chainable<JQuery<HTMLElement>>;

  constructor(findContainer: () => Cypress.Chainable<JQuery<HTMLElement>>) {
    this.findContainer = findContainer;
  }

  mockArchiveExperiment(experimentId: string, namespace: string) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/service/pipelines/${namespace}/dspa/apis/v2beta1/experiments/${experimentId}:archive`,
      },
      (req) => {
        req.reply({ body: {} });
      },
    );
  }

  mockRestoreExperiment(experimentId: string, namespace: string) {
    return cy.intercept(
      {
        method: 'POST',
        pathname: `/api/service/pipelines/${namespace}/dspa/apis/v2beta1/experiments/${experimentId}:unarchive`,
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

  getRowByName(name: string) {
    return new ExperimentsRow(() =>
      this.find().find(`[data-label=Experiment]`).contains(name).parents('tr'),
    );
  }

  findRows() {
    return this.find().find('[data-label=Experiment]').parents('tr');
  }

  findRowKebabByName(name: string) {
    return this.getRowByName(name).findKebabAction(name);
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
      .findByTestId('pipeline-filter-text-field');
  }
}

export const experimentsTabs = new ExperimentsTabs();
