const mockWorkspacePackages = [
  {
    name: '@odh-dashboard/kserve',
    path: '/workspace/packages/kserve',
    exports: { './extensions': './extensions.ts' },
  },
  {
    name: '@odh-dashboard/model-serving',
    path: '/workspace/packages/model-serving',
    exports: { './extensions': './extensions.ts' },
  },
  {
    name: '@odh-dashboard/internal',
    path: '/workspace/frontend/src/__mocks__',
    exports: { './extensions': './extensions.ts' },
  },
  {
    name: '@odh-dashboard/tsconfig',
    path: '/workspace/packages/tsconfig',
    exports: {},
  },
];

beforeEach(() => {
  jest.resetModules();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getPluginPackageDetails', () => {
  it('should return plugin packages with short names and locations, excluding internal', () => {
    jest.doMock('child_process', () => ({
      execSync: jest.fn().mockReturnValue(JSON.stringify(mockWorkspacePackages)),
    }));

    const { getPluginPackageDetails } = require('../discoverPluginPackages');
    const result = getPluginPackageDetails();

    expect(result).toEqual([
      {
        name: '@odh-dashboard/kserve',
        shortName: 'kserve',
        location: '/workspace/packages/kserve',
      },
      {
        name: '@odh-dashboard/model-serving',
        shortName: 'model-serving',
        location: '/workspace/packages/model-serving',
      },
    ]);
  });

  it('should return empty array when no workspace packages exist', () => {
    jest.doMock('child_process', () => ({
      execSync: jest.fn().mockReturnValue(JSON.stringify([])),
    }));

    const { getPluginPackageDetails } = require('../discoverPluginPackages');
    expect(getPluginPackageDetails()).toEqual([]);
  });

  it('should return empty array when npm query fails', () => {
    jest.doMock('child_process', () => ({
      execSync: jest.fn().mockImplementation(() => {
        throw new Error('npm query failed');
      }),
    }));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { getPluginPackageDetails } = require('../discoverPluginPackages');
    expect(getPluginPackageDetails()).toEqual([]);

    expect(warnSpy).toHaveBeenCalledWith(
      'Error querying workspaces with npm query:',
      'npm query failed',
    );
  });

  it('should strip the org scope to produce shortName', () => {
    const packages = [
      {
        name: '@custom-org/my-plugin',
        path: '/workspace/packages/my-plugin',
        exports: { './extensions': './extensions.ts' },
      },
    ];

    jest.doMock('child_process', () => ({
      execSync: jest.fn().mockReturnValue(JSON.stringify(packages)),
    }));

    const { getPluginPackageDetails } = require('../discoverPluginPackages');
    const result = getPluginPackageDetails();

    expect(result).toEqual([
      {
        name: '@custom-org/my-plugin',
        shortName: 'my-plugin',
        location: '/workspace/packages/my-plugin',
      },
    ]);
  });

  it('should skip packages with missing path and warn', () => {
    const packages = [
      {
        name: '@odh-dashboard/no-path-plugin',
        exports: { './extensions': './extensions.ts' },
      },
      {
        name: '@odh-dashboard/has-path-plugin',
        path: '/workspace/packages/has-path-plugin',
        exports: { './extensions': './extensions.ts' },
      },
    ];

    jest.doMock('child_process', () => ({
      execSync: jest.fn().mockReturnValue(JSON.stringify(packages)),
    }));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { getPluginPackageDetails } = require('../discoverPluginPackages');
    const result = getPluginPackageDetails();

    expect(result).toEqual([
      {
        name: '@odh-dashboard/has-path-plugin',
        shortName: 'has-path-plugin',
        location: '/workspace/packages/has-path-plugin',
      },
    ]);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('@odh-dashboard/no-path-plugin'));
  });

  it('should cache the failure so subsequent calls do not re-run execSync', () => {
    const mockExecSync = jest.fn().mockImplementation(() => {
      throw new Error('npm query failed');
    });
    jest.doMock('child_process', () => ({ execSync: mockExecSync }));
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const {
      getPluginPackageDetails,
      discoverPluginPackages,
    } = require('../discoverPluginPackages');

    getPluginPackageDetails();
    discoverPluginPackages();

    expect(mockExecSync).toHaveBeenCalledTimes(1);
  });

  it('should memoize the npm query call across multiple invocations', () => {
    const mockExecSync = jest.fn().mockReturnValue(JSON.stringify(mockWorkspacePackages));
    jest.doMock('child_process', () => ({ execSync: mockExecSync }));

    const {
      getPluginPackageDetails,
      discoverPluginPackages,
    } = require('../discoverPluginPackages');

    getPluginPackageDetails();
    discoverPluginPackages();

    expect(mockExecSync).toHaveBeenCalledTimes(1);
  });
});
