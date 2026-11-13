const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  ALLOWED_ABSENCES,
  compareDefaults,
  compareFlags,
  formatTable,
  parseBackendDefaults,
  parseBackendFlags,
  parseCrdDeprecatedFlags,
  parseCrdFlags,
  parseFrontendFlags,
  parseGoDefaults,
  parseGoStructFlags,
  parseTsTypeFlags,
  readSources,
} = require('../validate-dashboard-flags');

const CRD = [
  'spec:',
  '  versions:',
  '    - schema:',
  '        openAPIV3Schema:',
  '          properties:',
  '            spec:',
  '              properties:',
  '                dashboardConfig:',
  "                  description: 'Feature flag configurations'",
  '                  type: object',
  '                  properties:',
  '                    enablement:',
  '                      type: boolean',
  "                      description: 'When true, enables things.'",
  '                    # a comment between properties',
  '                    disableOld:',
  '                      type: boolean',
  "                      description: 'DEPRECATED: no longer used.'",
  '                    nested:',
  '                      type: object',
  '                      properties:',
  '                        notAFlag:',
  '                          type: boolean',
  '                  x-kubernetes-validations:',
  "                    - rule: '!has(self.disableOld)'",
  '                notebookSizes:',
  '                  type: array',
].join('\n');

const TS_TYPE = `
export type Other = { ignored: boolean };
export type DashboardCommonConfig = {
  enablement: boolean;
  optionalFlag?: boolean;
  // commentedOut: boolean;
};
export type After = { alsoIgnored: boolean };
`;

const FRONTEND = `
export const groupA = {
  enablement: false,
  // notAFlag: true,
} satisfies Partial<DashboardCommonConfig>;

export const groupB = {
  optionalFlag: true,
} satisfies Partial<DashboardCommonConfig>;

const allFeatureFlagsConfig = {
  ...groupA,
  ...groupB,
} satisfies DashboardCommonConfig;
`;

const BACKEND = `
export const blankDashboardCR: DashboardConfig = {
  metadata: { name: 'odh-dashboard-config', labels: { 'opendatahub.io/dashboard': 'true' } },
  spec: {
    dashboardConfig: {
      // Defaults
      enablement: true,
      disableTracking: false,
    },
    notebookController: {
      enabled: true,
    },
  },
};
`;

const GO = `
type DashboardFeatureFlags struct {
	Enablement      bool \`json:"enablement"\`
	DisableTracking bool \`json:"disableTracking,omitempty"\`
	Skipped         bool \`json:"-"\`
}

var BlankDashboardCR = DashboardConfig{
	Spec: DashboardConfigSpec{
		DashboardConfig: DashboardFeatureFlags{
			Enablement:      true,
			DisableTracking: true,
		},
		NotebookController: &NotebookController{
			Enabled: true,
		},
	},
}
`;

describe('parsers', () => {
  it('parseCrdFlags reads only the direct dashboardConfig properties', () => {
    assert.deepEqual(parseCrdFlags(CRD), ['enablement', 'disableOld', 'nested']);
  });

  it('parseCrdDeprecatedFlags returns properties whose description starts with DEPRECATED', () => {
    assert.deepEqual(parseCrdDeprecatedFlags(CRD), ['disableOld']);
  });

  it('parseCrdFlags throws when dashboardConfig is missing', () => {
    assert.throws(() => parseCrdFlags('spec:\n  foo: bar\n'), /dashboardConfig/);
  });

  it('parseTsTypeFlags reads required and optional keys, skipping comments', () => {
    assert.deepEqual(parseTsTypeFlags(TS_TYPE, 'DashboardCommonConfig'), [
      'enablement',
      'optionalFlag',
    ]);
  });

  it('parseFrontendFlags follows the spread groups of the combined object', () => {
    assert.deepEqual(parseFrontendFlags(FRONTEND, 'allFeatureFlagsConfig'), [
      'enablement',
      'optionalFlag',
    ]);
  });

  it('parseFrontendFlags throws when the combined object spreads nothing', () => {
    assert.throws(
      () => parseFrontendFlags('const allFeatureFlagsConfig = {};', 'allFeatureFlagsConfig'),
      /spreads no flag groups/,
    );
  });

  it('parseBackendFlags reads dashboardConfig only, not sibling spec fields', () => {
    assert.deepEqual(parseBackendFlags(BACKEND, 'blankDashboardCR'), [
      'enablement',
      'disableTracking',
    ]);
  });

  it('parseBackendDefaults returns boolean values', () => {
    assert.deepEqual(parseBackendDefaults(BACKEND, 'blankDashboardCR'), {
      enablement: true,
      disableTracking: false,
    });
  });

  it('parseGoStructFlags reads json tags and skips "-"', () => {
    assert.deepEqual(parseGoStructFlags(GO, 'DashboardFeatureFlags'), [
      'enablement',
      'disableTracking',
    ]);
  });

  it('parseGoDefaults maps Go field names back to json tags', () => {
    assert.deepEqual(parseGoDefaults(GO, 'DashboardFeatureFlags', 'BlankDashboardCR'), {
      enablement: true,
      disableTracking: true,
    });
  });

  it('parseGoDefaults treats a bool field missing from the literal as false', () => {
    const omitted = GO.replace('\t\t\tDisableTracking: true,\n', '');
    assert.deepEqual(parseGoDefaults(omitted, 'DashboardFeatureFlags', 'BlankDashboardCR'), {
      enablement: true,
      disableTracking: false,
    });
  });

  it('reports drift when a true default is dropped from the Go literal', () => {
    const backend = BACKEND.replace('disableTracking: false', 'disableTracking: true');
    const omitted = GO.replace('\t\t\tDisableTracking: true,\n', '');
    assert.deepEqual(
      compareDefaults({
        backend: parseBackendDefaults(backend, 'blankDashboardCR'),
        coreBff: parseGoDefaults(omitted, 'DashboardFeatureFlags', 'BlankDashboardCR'),
      }),
      ['"disableTracking" defaults to true in backend but false in coreBff'],
    );
  });

  it('parseGoDefaults reads a value followed by a trailing or block comment', () => {
    const commented = GO.replace(
      '\t\t\tEnablement:      true,\n',
      '\t\t\tEnablement:      false, // off by default\n',
    ).replace('\t\t\tDisableTracking: true,\n', '\t\t\tDisableTracking: false, /* off */\n');
    assert.deepEqual(parseGoDefaults(commented, 'DashboardFeatureFlags', 'BlankDashboardCR'), {
      enablement: false,
      disableTracking: false,
    });
  });

  it('parseBackendDefaults reads a value followed by a trailing or block comment', () => {
    const commented = BACKEND.replace(
      '      enablement: true,\n',
      '      enablement: false, // off by default\n',
    ).replace('      disableTracking: false,\n', '      disableTracking: true, /* on */\n');
    assert.deepEqual(parseBackendDefaults(commented, 'blankDashboardCR'), {
      enablement: false,
      disableTracking: true,
    });
  });

  it('reports drift hidden behind a trailing comment on either side', () => {
    const go = GO.replace(
      '\t\t\tDisableTracking: true,\n',
      '\t\t\tDisableTracking: true, // enable tracking by default\n',
    );
    assert.deepEqual(
      compareDefaults({
        backend: parseBackendDefaults(BACKEND, 'blankDashboardCR'),
        coreBff: parseGoDefaults(go, 'DashboardFeatureFlags', 'BlankDashboardCR'),
      }),
      ['"disableTracking" defaults to false in backend but true in coreBff'],
    );
  });

  it('parseGoDefaults rejects a default it cannot parse', () => {
    const unparsed = GO.replace(
      '\t\t\tDisableTracking: true,\n',
      '\t\t\tDisableTracking: !false,\n',
    );
    assert.throws(
      () => parseGoDefaults(unparsed, 'DashboardFeatureFlags', 'BlankDashboardCR'),
      /cannot parse default "DisableTracking: !false,"/,
    );
  });

  it('parseBackendDefaults rejects a default it cannot parse', () => {
    const unparsed = BACKEND.replace(
      '      disableTracking: false,\n',
      '      disableTracking: false, enablement: true,\n',
    );
    assert.throws(
      () => parseBackendDefaults(unparsed, 'blankDashboardCR'),
      /cannot parse default "disableTracking: false, enablement: true,"/,
    );
  });

  it('keeps "//" inside string literals when stripping comments', () => {
    const withUrl = TS_TYPE.replace(
      '  optionalFlag?: boolean;\n',
      "  optionalFlag?: 'https://example.com'; // trailing\n",
    );
    assert.deepEqual(parseTsTypeFlags(withUrl, 'DashboardCommonConfig'), [
      'enablement',
      'optionalFlag',
    ]);
  });
});

describe('compareFlags', () => {
  it('passes when every copy has the same flags', () => {
    const { rows, errors } = compareFlags({ a: ['x', 'y'], b: ['y', 'x'] }, {});
    assert.deepEqual(errors, []);
    assert.deepEqual(
      rows.map((r) => r.flag),
      ['x', 'y'],
    );
  });

  it('reports a flag missing from one copy', () => {
    const { errors } = compareFlags({ a: ['x', 'y'], b: ['x'] }, {});
    assert.deepEqual(errors, ['"y" is missing from b (present in a)']);
  });

  it('reports duplicate declarations', () => {
    const { errors } = compareFlags({ a: ['x', 'x'], b: ['x'] }, {});
    assert.deepEqual(errors, ['a: flag "x" is declared more than once']);
  });

  it('accepts absences listed in the allow-list', () => {
    const { errors } = compareFlags(
      { a: ['x', 'y'], b: ['x'] },
      { y: { absentFrom: ['b'], reason: 'test' } },
    );
    assert.deepEqual(errors, []);
  });

  it('reports allow-list entries that are stale, unknown, or missing a reason', () => {
    const { errors } = compareFlags(
      { a: ['x', 'y'], b: ['x', 'y'] },
      { y: { absentFrom: ['b'], reason: '' }, gone: { absentFrom: ['a'], reason: 'r' } },
    );
    assert.deepEqual(errors, [
      'allow-list entry "y" needs a reason',
      'allow-list entry "y" says it is absent from b, but it is present; update the entry',
      'allow-list entry "gone" does not match any flag; remove it',
    ]);
  });

  it('lets deprecated flags be absent from every copy except the CRD', () => {
    const { rows, errors } = compareFlags(
      { crd: ['x', 'old'], type: ['x'], backend: ['x', 'old'] },
      {},
      ['old'],
    );
    assert.deepEqual(errors, []);
    assert.equal(rows.find((r) => r.flag === 'old').deprecated, true);
  });

  it('still requires deprecated flags in the CRD', () => {
    const { errors } = compareFlags({ crd: ['x'], backend: ['x', 'old'] }, {}, ['old']);
    assert.deepEqual(errors, ['"old" is missing from crd (present in backend)']);
  });
});

describe('compareDefaults', () => {
  it('reports differing default values', () => {
    assert.deepEqual(
      compareDefaults({ backend: { x: true, y: false }, coreBff: { x: false, y: false } }),
      ['"x" defaults to true in backend but false in coreBff'],
    );
  });

  it('ignores flags that only one side declares', () => {
    assert.deepEqual(compareDefaults({ backend: { x: true }, coreBff: {} }), []);
  });
});

describe('formatTable', () => {
  it('marks presence per copy and deprecated flags', () => {
    const table = formatTable(
      [
        { flag: 'x', present: { a: true, b: false }, deprecated: false },
        { flag: 'old', present: { a: true, b: true }, deprecated: true },
      ],
      ['a', 'b'],
    );
    const lines = table.split('\n');
    assert.match(lines[2], /^x\s+x\s+-/);
    assert.match(lines[3], /^old\s+x\s+x\s+deprecated$/);
  });
});

describe('repository copies', () => {
  it('agree with each other', () => {
    const { flagsBySource, deprecated, defaultsBySource } = readSources();
    const { errors } = compareFlags(flagsBySource, ALLOWED_ABSENCES, deprecated);
    assert.deepEqual([...errors, ...compareDefaults(defaultsBySource)], []);
  });
});
