import { configureMonacoYaml } from 'monaco-yaml';
import {
  configureDeploymentWizardMonacoYaml,
  DEPLOYMENT_WIZARD_YAML_MODEL_URI,
} from '../configureDeploymentWizardMonacoYaml';
import { ensureMonacoYamlEnvironment } from '../ensureMonacoYamlEnvironment';

jest.mock('monaco-yaml', () => ({
  configureMonacoYaml: jest.fn(() => ({
    dispose: jest.fn(),
    update: jest.fn(),
    getOptions: jest.fn(),
  })),
}));

jest.mock('../ensureMonacoYamlEnvironment', () => ({
  ensureMonacoYamlEnvironment: jest.fn(),
}));

const mockConfigureMonacoYaml = jest.mocked(configureMonacoYaml);
const mockEnsureMonacoYamlEnvironment = jest.mocked(ensureMonacoYamlEnvironment);

describe('configureDeploymentWizardMonacoYaml', () => {
  beforeEach(() => {
    mockConfigureMonacoYaml.mockClear();
    mockEnsureMonacoYamlEnvironment.mockReset();
  });

  afterEach(() => {
    delete (window as { monaco?: unknown }).monaco;
  });

  it('should expose a stable model URI for schema fileMatch registration', () => {
    expect(DEPLOYMENT_WIZARD_YAML_MODEL_URI).toBe('file:///deployment-wizard.yaml');
  });

  it('should enable syntax validation with an empty schemas array by default', () => {
    const monaco = {} as Parameters<typeof configureDeploymentWizardMonacoYaml>[0];

    configureDeploymentWizardMonacoYaml(monaco);

    expect(mockEnsureMonacoYamlEnvironment).toHaveBeenCalledTimes(1);
    expect(mockConfigureMonacoYaml).toHaveBeenCalledTimes(1);
    expect(mockConfigureMonacoYaml).toHaveBeenCalledWith(monaco, {
      enableSchemaRequest: false,
      hover: false,
      completion: false,
      validate: true,
      schemas: [],
    });
  });

  it('should accept a schemas array for future schema-aware registration', () => {
    const monaco = {} as Parameters<typeof configureDeploymentWizardMonacoYaml>[0];
    const schemas = [
      {
        uri: 'https://example.com/schema.json',
        fileMatch: [DEPLOYMENT_WIZARD_YAML_MODEL_URI],
        schema: { type: 'object' },
      },
    ];

    configureDeploymentWizardMonacoYaml(monaco, { schemas });

    expect(mockConfigureMonacoYaml).toHaveBeenCalledWith(
      monaco,
      expect.objectContaining({
        validate: true,
        schemas,
      }),
    );
  });

  it('should keep the beforeMount Monaco on window when worker setup replaces it', () => {
    const editorMonaco = {} as Parameters<typeof configureDeploymentWizardMonacoYaml>[0];
    const remoteMonaco = { kind: 'remote' };
    const browserWindow = window as { monaco?: unknown };
    browserWindow.monaco = remoteMonaco;
    mockEnsureMonacoYamlEnvironment.mockImplementation(() => {
      browserWindow.monaco = remoteMonaco;
    });

    configureDeploymentWizardMonacoYaml(editorMonaco);

    expect(browserWindow.monaco).toBe(editorMonaco);
    expect(mockConfigureMonacoYaml).toHaveBeenCalledWith(
      editorMonaco,
      expect.objectContaining({ validate: true }),
    );
  });
});
