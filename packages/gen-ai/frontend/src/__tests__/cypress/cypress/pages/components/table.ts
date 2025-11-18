import { Contextual } from './Contextual';

export class TableRow extends Contextual<HTMLTableRowElement> {
  findCheckbox(): Cypress.Chainable<JQuery<HTMLInputElement>> {
    return this.find().find('input[type="checkbox"]');
  }

  shouldBeChecked(): this {
    this.findCheckbox().should('be.checked');
    return this;
  }

  shouldNotBeChecked(): this {
    this.findCheckbox().should('not.be.checked');
    return this;
  }
}

export class TableRowWithStatus extends TableRow {
  constructor(
    parentSelector: () => Cypress.Chainable<JQuery<HTMLTableRowElement>>,
    protected statusBadgeTestId: string,
  ) {
    super(parentSelector);
  }

  findStatusBadge(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId(this.statusBadgeTestId);
  }

  waitForStatusLoad(): void {
    this.find()
      .find('td', { timeout: 15000 })
      .invoke('text')
      .should('not.match', /Loading/i);
  }

  verifyStatus(expectedStatus?: string): void {
    const badge = this.findStatusBadge().should('exist');

    if (!expectedStatus) {
      badge.invoke('text');
      return;
    }

    badge
      .should('be.visible')
      .invoke('text')
      .then((text) => {
        const badgeText = text.trim().toLowerCase();
        const expectedLower = expectedStatus.toLowerCase().split(' ')[0];

        if (!badgeText.includes(expectedLower)) {
          throw new Error(`Expected "${expectedStatus}", found: "${text.trim()}"`);
        }
      });
  }

  getStatusText(): Cypress.Chainable<string> {
    return this.findStatusBadge()
      .invoke('text')
      .then((text) => text.trim());
  }
}
