export class Contextual<E extends HTMLElement> {
  constructor(private parentSelector: () => Cypress.Chainable<JQuery<E>>) {}

  find() {
    return this.parentSelector();
  }
}
