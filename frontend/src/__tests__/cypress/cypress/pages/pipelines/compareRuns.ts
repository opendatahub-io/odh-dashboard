class CompareRunsGlobal {
  visit(projectName: string, experimentId: string, runIds: string[] = []) {
    cy.visit(`/experiments/${projectName}/${experimentId}/compareRuns?runs=${runIds.join(',')}`);
  }

  findInvalidRunsError() {
    return cy.findByTestId('compare-runs-invalid-number-runs');
  }

  findRunList() {
    return cy.findByTestId('compare-runs-table');
  }

  findRunListRowByName(name: string) {
    return this.findRunList().findByText(name);
  }
}

export const compareRunsGlobal = new CompareRunsGlobal();
