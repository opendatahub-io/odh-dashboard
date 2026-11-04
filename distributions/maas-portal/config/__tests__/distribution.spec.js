const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const ts = require('typescript');

const distribution = YAML.parse(
  fs.readFileSync(path.resolve(__dirname, '../../distribution.yaml'), 'utf8'),
);
const genAiPackage = require('../../../../packages/gen-ai/package.json');

describe('MaaS Portal Gen AI registration', () => {
  it('should use the shared extension entry point', () => {
    const genAi = distribution.packages.bundled.find(
      (entry) => entry.package === '@odh-dashboard/gen-ai',
    );
    expect(genAi.extensionsPath).toBe('./extensions/static');
    expect(genAiPackage.exports[genAi.extensionsPath]).toBe('./frontend/src/odh/extensions.ts');
  });

  it('should register the MaaS package with its shared extension entry point', () => {
    const maas = distribution.packages.bundled.find(
      (entry) => entry.package === '@odh-dashboard/maas',
    );
    expect(maas.extensionsPath).toBe('./extensions/static');
  });

  it('should resolve the public page types without consumer aliases', () => {
    const { resolvedModule } = ts.resolveModuleName(
      '@odh-dashboard/gen-ai/MaaSModelsPageProvider',
      path.resolve(__dirname, '../../src/extensions.ts'),
      { moduleResolution: ts.ModuleResolutionKind.Bundler },
      ts.sys,
    );

    expect(resolvedModule.resolvedFileName).toBe(
      path.resolve(__dirname, '../../../../packages/gen-ai/types/MaaSModelsPageProvider.d.ts'),
    );
    expect(
      ts
        .preProcessFile(fs.readFileSync(resolvedModule.resolvedFileName, 'utf8'))
        .importedFiles.map(({ fileName }) => fileName),
    ).toEqual(['react']);
  });

  it('should keep the public page runtime export pointing to the implementation', () => {
    expect(require.resolve('@odh-dashboard/gen-ai/MaaSModelsPageProvider')).toBe(
      path.resolve(
        __dirname,
        '../../../../packages/gen-ai/frontend/src/app/pages/MaaSModelsPageProvider.tsx',
      ),
    );
  });

  it('should expose the shared Gen AI extension entry point', () => {
    expect(genAiPackage.exports['./extensions/static']).toBe('./frontend/src/odh/extensions.ts');
  });
});
