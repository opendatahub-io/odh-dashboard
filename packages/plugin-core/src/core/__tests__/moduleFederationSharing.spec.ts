import * as fs from 'fs';
import * as path from 'path';

type PluginCorePackage = {
  exports: Record<string, string>;
  'module-federation-shared'?: string[];
};

const hasReactContext = (directory: string): boolean =>
  fs.readdirSync(directory, { withFileTypes: true }).some((entry) => {
    if (entry.name === '__tests__' || entry.name === '__mocks__') {
      return false;
    }
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return hasReactContext(entryPath);
    }
    return (
      /\.(?:ts|tsx)$/.test(entry.name) &&
      /\b(?:React\.)?createContext\b/.test(fs.readFileSync(entryPath, 'utf8'))
    );
  });

describe('plugin-core Module Federation sharing policy', () => {
  it('should share every context-owning package export subpath', () => {
    const packageRoot = path.resolve(__dirname, '../../..');
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
    ) as PluginCorePackage;
    const sharedExports = new Set(packageJson['module-federation-shared'] ?? []);

    const contextOwningExports = Object.entries(packageJson.exports)
      .filter(([exportPath]) => exportPath !== '.')
      .filter(([, sourcePath]) =>
        hasReactContext(path.dirname(path.resolve(packageRoot, sourcePath))),
      )
      .map(([exportPath]) => exportPath);

    expect(contextOwningExports).not.toHaveLength(0);
    for (const exportPath of contextOwningExports) {
      expect(sharedExports).toContain(exportPath);
    }
  });
});
