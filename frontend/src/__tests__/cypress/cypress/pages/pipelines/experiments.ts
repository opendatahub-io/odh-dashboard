/* eslint-disable camelcase */

import type { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';
import { TableRow } from '~/__tests__/cypress/cypress/pages/components/table';

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
    return cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/experiments',
      {
        path: { namespace, serviceName: 'dspa' },
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

  findExperimentCreatedTime() {
    return this.find().find(`[data-label="Created"]`);
  }

  findExperimentLastRunTime() {
    return this.find().find(`[data-label="Last run started"]`);
  }
}

class ExperimentsTable {
  private findContainer: () => Cypress.Chainable<JQuery<HTMLElement>>;

  constructor(findContainer: () => Cypress.Chainable<JQuery<HTMLElement>>) {
    this.findContainer = findContainer;
  }

  mockArchiveExperiment(experimentId: string, namespace: string) {
    return cy.interceptOdh(
      'POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/experiments/:experimentId',
      { path: { namespace, serviceName: 'dspa', experimentId: `${experimentId}:archive` } },
      (req) => {
        req.reply({ body: {} });
      },
    );
  }

  mockRestoreExperiment(experimentId: string, namespace: string) {
    return cy.interceptOdh(
      'POST /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/experiments/:experimentId',
      { path: { namespace, serviceName: 'dspa', experimentId: `${experimentId}:unarchive` } },
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
    return cy.findByTestId('experiment-table-toolbar-actions').parent();
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
