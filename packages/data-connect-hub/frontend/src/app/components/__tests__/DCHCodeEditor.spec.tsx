import React from 'react';
import { jest } from '@jest/globals';
import { render } from '@testing-library/react';
import { Language } from '@patternfly/react-code-editor';
import type DCHCodeEditor from '~/app/components/DCHCodeEditor';

jest.mock('monaco-editor', () => ({ __esModule: true, editor: {} }), { virtual: true });
jest.mock('@monaco-editor/react', () => ({ loader: { config: jest.fn() } }));
jest.mock('@patternfly/react-code-editor', () => ({
  ...jest.requireActual<typeof import('@patternfly/react-code-editor')>(
    '@patternfly/react-code-editor',
  ),
  CodeEditor: jest.fn(() => null),
}));

describe('DCHCodeEditor', () => {
  it.each([
    ['python', Language.python],
    ['rest', Language.shell],
  ] as const)(
    'should use local Monaco before mounting the %s editor',
    async (example, language) => {
      await jest.isolateModulesAsync(async () => {
        const { loader } = require('@monaco-editor/react') as typeof import('@monaco-editor/react');
        const monaco = require('monaco-editor') as typeof import('monaco-editor');
        const { CodeEditor } =
          require('@patternfly/react-code-editor') as typeof import('@patternfly/react-code-editor');
        const Editor = require('~/app/components/DCHCodeEditor').default as typeof DCHCodeEditor;
        render(<Editor code="example code" example={example} isDarkTheme />);

        expect(loader.config).toHaveBeenCalledWith({ monaco });
        expect(window).toHaveProperty('monaco', monaco);
        expect(jest.mocked(loader.config).mock.invocationCallOrder[0]).toBeLessThan(
          jest.mocked(CodeEditor).mock.invocationCallOrder[0],
        );
        expect(jest.mocked(CodeEditor).mock.calls[0][0]).toEqual(
          expect.objectContaining({
            code: 'example code',
            language,
            isReadOnly: true,
            isCopyEnabled: true,
            isDarkTheme: true,
          }),
        );

        // A host-provided editor can have its own loader; it must also avoid the CDN.
        const { loader: unconfiguredLoader } =
          jest.requireActual<typeof import('@monaco-editor/react')>('@monaco-editor/react');
        const appendScript = jest.spyOn(document.body, 'appendChild');
        try {
          await expect(unconfiguredLoader.init()).resolves.toBe(monaco);
          expect(appendScript).not.toHaveBeenCalled();
        } finally {
          appendScript.mockRestore();
        }
      });
    },
  );
});
