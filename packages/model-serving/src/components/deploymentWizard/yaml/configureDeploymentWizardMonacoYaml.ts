import { configureMonacoYaml, type MonacoYaml, type MonacoYamlOptions } from 'monaco-yaml';
import { ensureMonacoYamlEnvironment } from './ensureMonacoYamlEnvironment';

/** Stable model URI so future schema registration can `fileMatch` this path. */
export const DEPLOYMENT_WIZARD_YAML_MODEL_URI = 'file:///deployment-wizard.yaml';

export type ConfigureDeploymentWizardMonacoYamlOptions = Pick<MonacoYamlOptions, 'schemas'>;

type MonacoEditorInstance = Parameters<typeof configureMonacoYaml>[0];

/**
 * Wires `monaco-yaml` for syntax-level validation in the deployment wizard YAML editor.
 * Passes an empty `schemas` array by default so schema-aware linting can be added later
 * without reworking this call site.
 *
 * Monaco + yaml worker are initialized in this remote (see ensureMonacoYamlEnvironment)
 * because MF gives the remote its own `@monaco-editor/react` loader instance.
 */
export const configureDeploymentWizardMonacoYaml = (
  monaco: MonacoEditorInstance,
  options: ConfigureDeploymentWizardMonacoYamlOptions = {},
): MonacoYaml => {
  ensureMonacoYamlEnvironment();
  return configureMonacoYaml(monaco, {
    enableSchemaRequest: false,
    hover: false,
    completion: false,
    validate: true,
    schemas: options.schemas ?? [],
  });
};
