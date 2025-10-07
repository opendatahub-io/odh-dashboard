/* eslint-disable camelcase */

import { type ExperimentKF } from '#~/concepts/pipelines/kfTypes';
import { TableRow } from '#~/__tests__/cypress/cypress/pages/components/table';

class ExperimentsTabs {
  visit(namespace?: string, tab?: string) {
    cy.visitWithLogin(
      `/develop-train/experiments${namespace ? `/${namespace}` : ''}${tab ? `/${tab}` : ''}`,
    );
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

  mockGetExperiments(namespace: string, experiments: ExperimentKF[]): Cypress.Chainable<null> {
    return cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/experiments',
      {
        path: { namespace, serviceName: 'dspa' },
      },
      (req) => {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        const { filter, sort_by, page_size } = req.query;
        let results = experiments;
        if (sort_by) {
          const fields = sort_by.toString().split(' ');
          const sortField = fields[0];
          const sortDirection = fields[1];
          // more fields to be added
          if (sortField === 'created_at') {
            if (sortDirection === 'desc') {
              results = results.toSorted(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
              );
            } else {
              results = results.toSorted(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
              );
            }
          }
        }
        if (filter) {
          const { predicates } = JSON.parse(decodeURIComponent(filter.toString()));

          if (predicates.length > 0) {
            predicates.forEach((predicate: { key: string; string_value: string }) => {
              // eslint-disable-next-line @typescript-eslint/naming-convention
              const { key, string_value } = predicate;
              if (key === 'storage_state') {
                results = results.filter((experiment) => experiment.storage_state === string_value);
              }
              if (key === 'name') {
                results = results.filter((experiment) =>
                  experiment.display_name.includes(string_value),
                );
              }
            });
          }
        }

        if (page_size) {
          results = results.slice(0, Number(page_size));
        }

        req.reply({ experiments: results, total_size: results.length });
      },
    );
  }
}

class ExperimentsRow extends TableRow {
  findCheckbox() {
    return this.find().find(`[data-label=Checkbox]`).find('input');
  }

  findDescription() {
    return this.find().findByTestId('table-row-title-description');
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
    return cy.findByTestId('experiment-table-toolbar-actions');
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
