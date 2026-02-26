import { Contextual } from './Contextual';

interface YamlEditorWindow {
  monaco: {
    editor: {
      getEditors: () => Array<{
        getModel: () => { getValue: () => string; setValue: (value: string) => void } | null;
      }>;
    };
  };
}

export class YamlEditor extends Contextual<HTMLElement> {
  constructor() {
    super(() => cy.findByTestId('yaml-editor').find('.monaco-editor'));
  }

  containsText(text: string): Cypress.Chainable<JQuery<HTMLElement>> {
    // .contains() command normalizes &nbsp; to regular spaces while the assertion does not
    return this.find().contains(text);
  }

  replaceInYAMLEditor(oldText: string, newText: string): void {
    this.find().then(($el) => {
      const win = $el[0].ownerDocument.defaultView as unknown as YamlEditorWindow;
      const model = win.monaco.editor.getEditors()[0]?.getModel();
      if (!model) {
        throw new Error('No YAML editor model found');
      }
      expect(model.getValue()).to.include(oldText);
      model.setValue(model.getValue().replace(oldText, newText));
    });
  }
}
