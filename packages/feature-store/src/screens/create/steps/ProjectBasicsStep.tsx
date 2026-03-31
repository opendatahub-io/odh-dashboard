import React from 'react';
import {
  Form,
  FormGroup,
  FormSection,
  TextInput,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Switch,
  Alert,
} from '@patternfly/react-core';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import useAccessibleNamespaces from '../../../hooks/useAccessibleNamespaces';
import {
  FeatureStoreFormData,
  FEAST_PROJECT_NAME_REGEX,
  ProjectDirType,
  VALID_INIT_TEMPLATES,
} from '../types';

type UpdateObjectAtPropAndValue<T> = <K extends keyof T>(propKey: K, propValue: T[K]) => void;

type ProjectBasicsStepProps = {
  data: FeatureStoreFormData;
  setData: UpdateObjectAtPropAndValue<FeatureStoreFormData>;
  existingProjectNames: string[];
  namespaceSecrets: string[];
};

const ProjectBasicsStep: React.FC<ProjectBasicsStepProps> = ({
  data,
  setData,
  existingProjectNames,
  namespaceSecrets,
}) => {
  const { namespaces, loaded: namespacesLoaded } = useAccessibleNamespaces();

  const nameValid =
    data.feastProject.length === 0 || FEAST_PROJECT_NAME_REGEX.test(data.feastProject);
  const nameIsDuplicate = existingProjectNames.includes(data.feastProject);

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
    <Form>
      <FormSection title="Feature store details">
        <FormGroup label="Name" isRequired fieldId="feast-project-name">
          <TextInput
            id="feast-project-name"
            data-testid="feast-project-name"
            value={data.feastProject}
            onChange={(_e, val) => setData('feastProject', val)}
            validated={!nameValid || nameIsDuplicate ? 'error' : 'default'}
            placeholder="myfeaturestore"
          />
          <FormHelperText>
            <HelperText>
              {!nameValid ? (
                <HelperTextItem variant="error">
                  Must consist of lowercase alphanumeric characters, &apos;-&apos; or &apos;.&apos;,
                  and must start and end with an alphanumeric character.
                </HelperTextItem>
              ) : nameIsDuplicate ? (
                <HelperTextItem variant="error">
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

        <FormGroup label="Namespace" isRequired fieldId="feast-namespace">
          <SimpleSelect
            dataTestId="feast-namespace-toggle"
            options={namespaceOptions}
            value={data.namespace}
            placeholder={namespacesLoaded ? 'Select a namespace' : 'Loading...'}
            onChange={(key) => setData('namespace', key)}
            isFullWidth
          />
          <FormHelperText>
            <HelperText>
              <HelperTextItem>
                Only namespaces where you have permission to create feature stores are shown.
              </HelperTextItem>
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
                placeholder="feature_repo"
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>
                    Relative path to the feature repo subdirectory. Must not start with a slash.
                  </HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
            <FormGroup label="Credentials secret (envFrom)" fieldId="feast-git-envfrom">
              <SimpleSelect
                dataTestId="feast-git-envfrom"
                options={namespaceSecrets.map((s) => ({ key: s, label: s }))}
                value={data.gitSecretName}
                placeholder="Select a secret (optional)"
                onChange={(key) => setData('gitSecretName', key)}
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
        <Alert variant="info" isInline title="Multiple feature stores detected">
          Existing feature stores detected. Multiple feature store support requires a shared
          (remote) registry. If the existing feature store uses a local registry, the new one should
          use a remote registry pointing to it.
        </Alert>
      )}
    </Form>
  );
};

export default ProjectBasicsStep;
