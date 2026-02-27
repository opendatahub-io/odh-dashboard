import { Contextual } from './Contextual';

interface MonacoWindow {
  monaco: {
    editor: {
      getEditors: () => Array<{
        getModel: () => { getValue: () => string; setValue: (value: string) => void } | null;
      }>;
    };
  };
}

export class DashboardCodeEditor extends Contextual<HTMLElement> {
  findInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('.view-lines.monaco-mouse-cursor-text');
  }

  findUpload(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('input[type="file"]');
  }

  containsText(text: string): Cypress.Chainable<JQuery<HTMLElement>> {
    // .contains() command normalizes &nbsp; to regular spaces while the assertion does not
    return this.find().contains(text);
  }

  clear(): void {
    this.setValue('');
  }

  setValue(value: string): void {
    this.find().then(($el) => {
      const win = $el[0].ownerDocument.defaultView as unknown as MonacoWindow;
      const model = win.monaco.editor.getEditors()[0]?.getModel();
      if (!model) {
        throw new Error('No Monaco editor model found');
      }
      model.setValue(value);
    });
  }

  replaceInEditor(oldText: string, newText: string): void {
    this.find().then(($el) => {
      const win = $el[0].ownerDocument.defaultView as unknown as MonacoWindow;
      const model = win.monaco.editor.getEditors()[0]?.getModel();
      if (!model) {
        throw new Error('No Monaco editor model found');
      }
      expect(model.getValue()).to.include(oldText);
      model.setValue(model.getValue().replace(oldText, newText));
    });
  }
}
