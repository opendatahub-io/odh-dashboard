const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const distribution = YAML.parse(
  fs.readFileSync(path.resolve(__dirname, '../../distribution.yaml'), 'utf8'),
);
const genAiPackage = require('../../../../packages/gen-ai/package.json');

describe('MaaS Portal Gen AI registration', () => {
  it('should use the portal-only extension entry point with grid disabled by default', () => {
    const genAi = distribution.packages.bundled.find(
      (entry) => entry.package === '@odh-dashboard/gen-ai',
    );
    expect(genAi.extensionsPath).toBe('./extensions/maas-portal');
    expect(genAi.featureFlags.grid).toBe(false);
    expect(genAiPackage.exports[genAi.extensionsPath]).toBe(
      './frontend/src/odh/maasPortalExtensions.ts',
    );
  });

  it('should keep the MaaS and Gen AI grid defaults consistent', () => {
    const maas = distribution.packages.bundled.find(
      (entry) => entry.package === '@odh-dashboard/maas',
    );
    const genAi = distribution.packages.bundled.find(
      (entry) => entry.package === '@odh-dashboard/gen-ai',
    );
    expect(maas.featureFlags.grid).toBe(false);
    expect(genAi.featureFlags.grid).toBe(maas.featureFlags.grid);
  });

  it('should retain the separate default extension entry point for RHOAI', () => {
    expect(genAiPackage.exports['./extensions/static']).toBe('./frontend/src/odh/extensions.ts');
  });
});
