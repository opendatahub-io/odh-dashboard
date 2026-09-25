import * as fs from 'fs';
import * as path from 'path';

type PluginCorePackage = {
  exports: Record<string, string>;
  'module-federation-shared'?: string[];
};

// Heuristic guard: scan each export's directory tree for direct createContext declarations.
// This intentionally does not follow imports outside that tree; package metadata remains the
// source of truth, while this test catches the common omission when adding a context entry point.
const containsDirectReactContextDeclaration = (directory: string): boolean =>
  fs.readdirSync(directory, { withFileTypes: true }).some((entry) => {
    if (entry.name === '__tests__' || entry.name === '__mocks__') {
      return false;
    }
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return containsDirectReactContextDeclaration(entryPath);
    }
    return (
      /\.(?:ts|tsx)$/.test(entry.name) &&
      /\b(?:React\.)?createContext\b/.test(fs.readFileSync(entryPath, 'utf8'))
    );
  });

describe('plugin-core Module Federation sharing policy', () => {
  it('should share export subpaths whose directories directly declare React contexts', () => {
    const packageRoot = path.resolve(__dirname, '../../..');
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
    ) as PluginCorePackage;
    const sharedExports = new Set(packageJson['module-federation-shared'] ?? []);

    const contextDeclaringExports = Object.entries(packageJson.exports)
      .filter(([exportPath]) => exportPath !== '.')
      .filter(([, sourcePath]) =>
        containsDirectReactContextDeclaration(path.dirname(path.resolve(packageRoot, sourcePath))),
      )
      .map(([exportPath]) => exportPath);

    expect(contextDeclaringExports).not.toHaveLength(0);
    for (const exportPath of contextDeclaringExports) {
      expect(sharedExports).toContain(exportPath);
    }
  });
});
