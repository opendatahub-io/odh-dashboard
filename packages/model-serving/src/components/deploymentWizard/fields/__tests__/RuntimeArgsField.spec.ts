import { filterRuntimeArgsForContainer } from '../RuntimeArgsField';

describe('filterRuntimeArgsForContainer', () => {
  it('should strip comment headers and blank lines', () => {
    expect(
      filterRuntimeArgsForContainer([
        '# Validated arguments for Tool calling',
        '',
        '--enable-auto-tool-choice',
        '  # indented comment',
        '--tool-call-parser hermes',
      ]),
    ).toEqual(['--enable-auto-tool-choice', '--tool-call-parser hermes']);
  });
});
