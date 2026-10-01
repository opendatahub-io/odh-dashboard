import * as fs from 'fs';
import * as path from 'path';

describe('gateway discovery federation contract', () => {
  it('should declare the gateway context as a package-owned shared export', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../../package.json'), 'utf8'),
    ) as {
      exports: Record<string, string>;
      'module-federation-shared': string[];
    };

    expect(manifest.exports['./api/gatewayDiscovery']).toBe('./src/api/gatewayDiscovery.ts');
    expect(manifest['module-federation-shared']).toContain('./api/gatewayDiscovery');
  });
});
