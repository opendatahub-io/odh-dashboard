const ORIGINAL_ENV = process.env;

const loadConstModule = () => {
  jest.resetModules();
  return require('../const');
};

beforeEach(() => {
  // Reset DOM
  document.body.innerHTML = '';
  // Reset env
  process.env = { ...ORIGINAL_ENV };
  delete process.env.MF_REMOTES;
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('MF_REMOTES resolution', () => {
  it('prefers process.env.MF_REMOTES when set', () => {
    const expected = JSON.stringify([{ name: 'test', remoteEntry: '/remoteEntry.js' }]);
    process.env.MF_REMOTES = expected;

    const el = document.createElement('script');
    el.id = 'mf-remotes-json';
    el.textContent = JSON.stringify([{ name: 'invalid', remoteEntry: '/remoteEntry.js' }]);
    document.body.appendChild(el);

    const mod = loadConstModule();
    expect(mod.MF_REMOTES).toBe(expected);
  });

  it('parses JSON from #mf-remotes-json when env not set', () => {
    const expected = JSON.stringify([{ name: 'test', remoteEntry: '/remoteEntry.js' }]);
    const el = document.createElement('script');
    el.id = 'mf-remotes-json';
    el.textContent = expected;
    document.body.appendChild(el);

    const mod = loadConstModule();
    expect(mod.MF_REMOTES).toEqual(expected);
  });

  it('returns undefined when env not set and element missing', () => {
    const mod = loadConstModule();
    expect(mod.MF_REMOTES).toBeUndefined();
  });
});
