import { Contextual } from '#~/__tests__/cypress/cypress/pages/components/Contextual';
import { TableRow } from '#~/__tests__/cypress/cypress/pages/components/table';

class LMEvalListToolbar extends Contextual<HTMLElement> {
  findToggleButton(id: string) {
    return this.find().pfSwitch(id).click();
  }

  findFilterMenuOption(id: string, name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findToggleButton(id).parents().findByRole('menuitem', { name });
  }

  findSearchInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('filter-toolbar-text-field');
  }
}

class LMEvalRow extends TableRow {
  findModel() {
    return this.find().find(`[data-label=Model]`);
  }
}

class LMEvalList {
  findTableRows() {
    return cy.findAllByTestId('lm-eval-list-table-row');
  }

  private findTable() {
    return cy.findByTestId('lm-eval-table');
  }

  getRow(name: string) {
    return new LMEvalRow(() =>
      this.findTable().find(`[data-label=Evaluation]`).contains(name).parents('tr'),
    );
  }

  getTableToolbar() {
    return new LMEvalListToolbar(() => cy.findByTestId('lm-eval-table-toolbar'));
  }

  findSortButton(name: string) {
    return this.findTable().find('thead').findByRole('button', { name });
  }
}

export const lmEvalList = new LMEvalList();
