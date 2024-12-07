import { Contextual } from './Contextual';

export class DashboardCodeEditor extends Contextual<HTMLElement> {
  findInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('.view-lines.monaco-mouse-cursor-text');
  }

  findUpload(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('.pf-v6-c-code-editor__main input[type="file"]');
  }
}
