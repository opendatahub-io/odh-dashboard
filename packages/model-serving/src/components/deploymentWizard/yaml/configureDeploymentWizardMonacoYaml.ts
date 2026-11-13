import { configureMonacoYaml, type MonacoYaml, type MonacoYamlOptions } from 'monaco-yaml';
import { ensureMonacoYamlEnvironment } from './ensureMonacoYamlEnvironment';

/** Stable model URI so future schema registration can `fileMatch` this path. */
export const DEPLOYMENT_WIZARD_YAML_MODEL_URI = 'file:///deployment-wizard.yaml';

export type ConfigureDeploymentWizardMonacoYamlOptions = Pick<MonacoYamlOptions, 'schemas'>;

type MonacoEditorInstance = Parameters<typeof configureMonacoYaml>[0];

declare global {
  interface Window {
    monaco?: MonacoEditorInstance;
  }
}

/**
 * Wires `monaco-yaml` for syntax-level validation in the deployment wizard YAML editor.
 * Passes an empty `schemas` array by default so schema-aware linting can be added later
 * without reworking this call site.
 *
 * Bundled Monaco is selected when the YAML editor module loads
 * (see ensureMonacoYamlEnvironment), so PatternFly does not download the CDN build.
 * The supplied editor instance is published on `window.monaco` after that setup so a
 * remote Monaco import cannot replace the instance Cypress reads.
 */
export const configureDeploymentWizardMonacoYaml = (
  monaco: MonacoEditorInstance,
  options: ConfigureDeploymentWizardMonacoYamlOptions = {},
): MonacoYaml => {
  ensureMonacoYamlEnvironment();
  const monacoYaml = configureMonacoYaml(monaco, {
    enableSchemaRequest: false,
    hover: false,
    completion: false,
    validate: true,
    schemas: options.schemas ?? [],
  });
  if (typeof window !== 'undefined') {
    window.monaco = monaco;
  }
  return monacoYaml;
};
