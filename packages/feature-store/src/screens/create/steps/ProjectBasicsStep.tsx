import React from 'react';
import {
  Form,
  FormGroup,
  TextInput,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Switch,
  Alert,
} from '@patternfly/react-core';
import FormSection from '@odh-dashboard/internal/components/pf-overrides/FormSection';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import {
  FeatureStoreFormData,
  FEAST_PROJECT_NAME_REGEX,
  ProjectDirType,
  VALID_INIT_TEMPLATES,
} from '../types';

type UpdateObjectAtPropAndValue<T> = <K extends keyof T>(propKey: K, propValue: T[K]) => void;

type NamespaceInfo = {
  name: string;
  displayName: string;
};

type ProjectBasicsStepProps = {
  data: FeatureStoreFormData;
  setData: UpdateObjectAtPropAndValue<FeatureStoreFormData>;
  existingProjectNames: string[];
  namespaceSecrets: string[];
  accessibleNamespaces: { namespaces: NamespaceInfo[]; loaded: boolean; error?: Error };
};

const ProjectBasicsStep: React.FC<ProjectBasicsStepProps> = ({
  data,
  setData,
  existingProjectNames,
  namespaceSecrets,
  accessibleNamespaces,
}) => {
  const { namespaces, loaded: namespacesLoaded, error: namespacesError } = accessibleNamespaces;

  const nameValid =
    data.feastProject.length === 0 || FEAST_PROJECT_NAME_REGEX.test(data.feastProject);
  const nameIsDuplicate = existingProjectNames.includes(data.feastProject);
  const featureRepoPathInvalid = !!data.feastProjectDir?.git?.featureRepoPath?.startsWith('/');

  const namespaceOptions = namespaces.map((ns) => ({
    key: ns.name,
    label: ns.displayName !== ns.name ? `${ns.displayName} (${ns.name})` : ns.name,
  }));

  const projectDirOptions = [
    { key: ProjectDirType.NONE, label: 'Default (operator managed)' },
    { key: ProjectDirType.INIT, label: 'Feast init' },
    { key: ProjectDirType.GIT, label: 'Git repository' },
  ];

  const templateOptions = VALID_INIT_TEMPLATES.map((t) => ({
    key: t,
    label: t,
  }));

  const handleProjectDirChange = (key: string) => {
    switch (key) {
      case ProjectDirType.NONE:
        setData('projectDirType', ProjectDirType.NONE);
        setData('feastProjectDir', undefined);
        break;
      case ProjectDirType.INIT:
        setData('projectDirType', ProjectDirType.INIT);
        setData('feastProjectDir', { init: {} });
        break;
      case ProjectDirType.GIT:
        setData('projectDirType', ProjectDirType.GIT);
        setData('feastProjectDir', { git: { url: '' } });
        break;
      default:
        break;
    }
  };

  return (
    <Form maxWidth="750px">
      <FormSection title="Feature store details">
        <FormGroup label="Name" isRequired fieldId="feast-project-name">
          <TextInput
            id="feast-project-name"
            data-testid="feast-project-name"
            value={data.feastProject}
            onChange={(_e, val) => setData('feastProject', val)}
            validated={!nameValid || nameIsDuplicate ? 'error' : 'default'}
            placeholder="my-feature-store"
          />
          <FormHelperText>
            <HelperText>
              {!nameValid ? (
                <HelperTextItem variant="error" data-testid="feast-project-name-error">
                  Must consist of lowercase alphanumeric characters, &apos;-&apos; or &apos;.&apos;,
                  and must start and end with an alphanumeric character.
                </HelperTextItem>
              ) : nameIsDuplicate ? (
                <HelperTextItem variant="error" data-testid="feast-project-name-error">
                  A feature store with this name already exists.
                </HelperTextItem>
              ) : (
                <HelperTextItem>
                  Lowercase alphanumeric name with hyphens or dots. Must start and end with an
                  alphanumeric character.
                </HelperTextItem>
              )}
            </HelperText>
          </FormHelperText>
        </FormGroup>

        <FormGroup label="Project" isRequired fieldId="feast-namespace">
          <SimpleSelect
            dataTestId="feast-namespace-toggle"
            options={namespaceOptions}
            value={data.namespace}
            placeholder={namespacesLoaded ? 'Select a project' : 'Loading...'}
            isScrollable
            onChange={(key) => {
              if (key !== data.namespace) {
                setData('registrySecretName', '');
                setData('onlineStoreSecretName', '');
                setData('offlineStoreSecretName', '');
                setData('gitSecretName', '');
                setData('batchEngineConfigMapName', '');
                setData('batchEngineConfigMapKey', '');
                if (data.services?.registry?.remote?.tls) {
                  setData('services', {
                    ...data.services,
                    registry: {
                      ...data.services.registry,
                      remote: {
                        ...data.services.registry.remote,
                        tls: {
                          ...data.services.registry.remote.tls,
                          configMapRef: { name: '' },
                        },
                      },
                    },
                  });
                }
              }
              setData('namespace', key);
            }}
            isFullWidth
          />
          <FormHelperText>
            <HelperText>
              {namespacesError ? (
                <HelperTextItem variant="error">
                  Failed to load projects: {namespacesError.message}
                </HelperTextItem>
              ) : (
                <HelperTextItem>
                  Only projects where you have permission to create feature stores are shown.
                </HelperTextItem>
              )}
            </HelperText>
          </FormHelperText>
        </FormGroup>
      </FormSection>

      <FormSection title="Feature store directory">
        <FormGroup label="Source" fieldId="feast-project-dir-type">
          <SimpleSelect
            dataTestId="feast-project-dir-type"
            options={projectDirOptions}
            value={data.projectDirType}
            onChange={handleProjectDirChange}
            isScrollable
            isFullWidth
          />
        </FormGroup>

        {data.projectDirType === ProjectDirType.INIT && (
          <>
            <FormGroup label="Template" fieldId="feast-init-template">
              <SimpleSelect
                dataTestId="feast-init-template"
                options={templateOptions}
                value={data.feastProjectDir?.init?.template ?? ''}
                placeholder="Select a template"
                onChange={(key) =>
                  setData('feastProjectDir', {
                    init: { ...data.feastProjectDir?.init, template: key },
                  })
                }
                isScrollable
                isFullWidth
              />
            </FormGroup>
            <FormGroup fieldId="feast-init-minimal">
              <Switch
                id="feast-init-minimal"
                label="Minimal initialization"
                isChecked={data.feastProjectDir?.init?.minimal ?? false}
                onChange={(_e, checked) =>
                  setData('feastProjectDir', {
                    init: { ...data.feastProjectDir?.init, minimal: checked },
                  })
                }
              />
            </FormGroup>
          </>
        )}

        {data.projectDirType === ProjectDirType.GIT && (
          <>
            <FormGroup label="Repository URL" isRequired fieldId="feast-git-url">
              <TextInput
                id="feast-git-url"
                data-testid="feast-git-url"
                value={data.feastProjectDir?.git?.url ?? ''}
                onChange={(_e, val) =>
                  setData('feastProjectDir', { git: { ...data.feastProjectDir?.git, url: val } })
                }
                validated={!data.feastProjectDir?.git?.url ? 'error' : 'default'}
                placeholder="https://github.com/org/repo.git"
              />
            </FormGroup>
            <FormGroup label="Branch / tag / commit" fieldId="feast-git-ref">
              <TextInput
                id="feast-git-ref"
                value={data.feastProjectDir?.git?.ref ?? ''}
                onChange={(_e, val) =>
                  setData('feastProjectDir', {
                    git: {
                      ...data.feastProjectDir?.git,
                      url: data.feastProjectDir?.git?.url ?? '',
                      ref: val,
                    },
                  })
                }
                placeholder="main"
              />
            </FormGroup>
            <FormGroup label="Feature repo path" fieldId="feast-git-path">
              <TextInput
                id="feast-git-path"
                value={data.feastProjectDir?.git?.featureRepoPath ?? ''}
                onChange={(_e, val) =>
                  setData('feastProjectDir', {
                    git: {
                      ...data.feastProjectDir?.git,
                      url: data.feastProjectDir?.git?.url ?? '',
                      featureRepoPath: val,
                    },
                  })
                }
                validated={featureRepoPathInvalid ? 'error' : 'default'}
                placeholder="feature_repo"
              />
              <FormHelperText>
                <HelperText>
                  {featureRepoPathInvalid ? (
                    <HelperTextItem variant="error">
                      Feature repo path must not start with a slash.
                    </HelperTextItem>
                  ) : (
                    <HelperTextItem>
                      Relative path to the feature repo subdirectory. Must not start with a slash.
                    </HelperTextItem>
                  )}
                </HelperText>
              </FormHelperText>
            </FormGroup>
            <FormGroup label="Git credentials secret" fieldId="feast-git-envfrom">
              <SimpleSelect
                dataTestId="feast-git-envfrom"
                options={namespaceSecrets.map((s) => ({ key: s, label: s }))}
                value={data.gitSecretName}
                placeholder="Select a secret (optional)"
                onChange={(key) => setData('gitSecretName', key)}
                isScrollable
                isFullWidth
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Optional. Secret with credentials for private Git repositories, injected as
                    environment variables into the git-clone init container.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          </>
        )}
      </FormSection>

      {existingProjectNames.length > 0 && (
        <Alert variant="info" isInline title="Existing feature store detected">
          Creating another feature store requires a shared remote registry. If the existing feature
          store uses a local registry, configure this one with a remote registry that points to it.
        </Alert>
      )}
    </Form>
  );
};

export default ProjectBasicsStep;
