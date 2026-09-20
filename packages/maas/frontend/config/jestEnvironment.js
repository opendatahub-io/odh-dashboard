/**
 * jest-runtime@30.4 calls moduleMocker.clearMocksOnScope() during resetModules.
 * jest-environment-jsdom@30.2 still builds its mocker from jest-mock@30.2, which
 * lacks that method. Bridge the gap without bumping lockfile deps.
 */
const { TestEnvironment } = require('jest-environment-jsdom');

class MaasJestEnvironment extends TestEnvironment {
  constructor(config, context) {
    super(config, context);

    const mocker = this.moduleMocker;
    if (mocker && typeof mocker.clearMocksOnScope !== 'function') {
      mocker.clearMocksOnScope = (scope) => {
        for (const key of Object.keys(scope)) {
          const value = scope[key];
          if (
            value != null &&
            (typeof value === 'object' || typeof value === 'function') &&
            '_isMockFunction' in value &&
            typeof value.mockClear === 'function'
          ) {
            value.mockClear();
          }
        }
      };
    }
  }
}

module.exports = MaasJestEnvironment;
