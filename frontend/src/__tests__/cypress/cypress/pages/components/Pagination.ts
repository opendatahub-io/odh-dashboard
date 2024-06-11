class Pagination {
  constructor(private top = true) {}

  find() {
    return cy.get(
      this.top ? '#table-pagination-top-pagination' : '#table-pagination-bottom-pagination',
    );
  }

  findFirstButton() {
    return this.find().find('[data-action=first]');
  }

  findPreviousButton() {
    return this.find().find('[data-action=previous]');
  }

  findNextButton() {
    return this.find().find('[data-action=next]');
  }

  findLastButton() {
    return this.find().find('[data-action=last]');
  }

  findInput() {
    return this.find().findByRole('spinbutton', { name: 'Current page' });
  }

  private findMenuToggleButton() {
    return this.find()
      .find(this.top ? '#table-pagination-top-toggle' : '#table-pagination-bottom-toggle')
      .click();
  }

  selectToggleOption(name: string) {
    return this.findMenuToggleButton().parents().findByRole('menuitem', { name }).click();
  }
}

export const tablePagination = {
  top: new Pagination(true),
  bottom: new Pagination(false),
};
