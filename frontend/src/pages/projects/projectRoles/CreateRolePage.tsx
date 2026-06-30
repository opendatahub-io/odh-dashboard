import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  Flex,
  PageSection,
  Spinner,
  ToggleGroup,
  ToggleGroupItem,
  getUniqueId,
} from '@patternfly/react-core';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { getDisplayNameFromK8sResource, translateDisplayNameForK8s } from '@odh-dashboard/k8s-core';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { useAccessReview } from '#~/api/useAccessReview';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { isValidK8sLabelKeyValue } from '#~/concepts/k8s/utils';
import { useK8sNameDescriptionFieldData } from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { RoleKind } from '#~/k8sTypes';
import { createRole } from '#~/api';
import CreateRoleForm from './CreateRoleForm';
import CreateRoleFooter from './CreateRoleFooter';
import CreateRoleConfirmModal from './CreateRoleConfirmModal';
import CreateRoleYamlView from './CreateRoleYamlView';
import DiscardChangesConfirmModal from './DiscardChangesConfirmModal';
import SelectTemplateModal from './SelectTemplateModal';
import type { RoleTemplate } from './roleTemplateCatalog';
import assembleRole from './assembleRole';
import { fromK8sLabels, toK8sLabels } from './labelUtils';
import { USER_LABEL_PREFIX } from './const';
import type { LabelEntry, RuleEntry } from './types';

type ViewMode = 'form' | 'yaml';

type TemplateModalState =
  | { type: 'none' }
  | { type: 'discardConfirm'; nextMode: 'select' | 'addRules' }
  | { type: 'selectTemplate'; mode: 'select' | 'addRules' };

type CreateRolePageProps = {
  existingRole?: RoleKind;
};

const CreateRolePage: React.FC<CreateRolePageProps> = ({ existingRole }) => {
  const { namespace = '' } = useParams<{ namespace: string }>();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const displayName = getDisplayNameFromK8sResource(currentProject);
  const isEdit = !!existingRole;
  const navigate = useNavigate();

  const [allowAccess, loaded] = useAccessReview({
    group: 'rbac.authorization.k8s.io',
    resource: 'roles',
    namespace,
    verb: isEdit ? 'update' : 'create',
  });

  const k8sNameDescriptionData = useK8sNameDescriptionFieldData({
    initialData: existingRole,
  });
  const [description, setDescription] = React.useState(
    () => existingRole?.metadata.annotations?.['openshift.io/description'] ?? '',
  );
  const [labels, setLabels] = React.useState<LabelEntry[]>(() =>
    fromK8sLabels(existingRole?.metadata.labels),
  );
  const [rules, setRules] = React.useState<RuleEntry[]>(() => {
    if (!existingRole?.rules) {
      return [];
    }
    return existingRole.rules.map((rule) => ({
      ...rule,
      id: getUniqueId('rule'),
    }));
  });

  const [viewMode, setViewMode] = React.useState<ViewMode>('form');
  const [submitError, setSubmitError] = React.useState<Error>();
  const [showNoRulesConfirm, setShowNoRulesConfirm] = React.useState(false);
  const [templateModal, setTemplateModal] = React.useState<TemplateModalState>({ type: 'none' });

  const isFormDirty = React.useMemo(
    () =>
      k8sNameDescriptionData.data.name !== '' ||
      k8sNameDescriptionData.data.k8sName.state.touched ||
      description !== '' ||
      labels.length > 0 ||
      rules.length > 0,
    [
      k8sNameDescriptionData.data.name,
      k8sNameDescriptionData.data.k8sName.state.touched,
      description,
      labels.length,
      rules.length,
    ],
  );

  const handleSelectTemplateClick = React.useCallback(() => {
    if (isFormDirty) {
      setTemplateModal({ type: 'discardConfirm', nextMode: 'select' });
    } else {
      setTemplateModal({ type: 'selectTemplate', mode: 'select' });
    }
  }, [isFormDirty]);

  const handleImportTemplateClick = React.useCallback(() => {
    setTemplateModal({ type: 'selectTemplate', mode: 'addRules' });
  }, []);

  const handleDiscardConfirm = React.useCallback(() => {
    if (templateModal.type === 'discardConfirm') {
      k8sNameDescriptionData.onDataChange('k8sName', '');
      k8sNameDescriptionData.onDataChange('name', '');
      setDescription('');
      setLabels([]);
      setRules([]);
      setSubmitError(undefined);
      setTemplateModal({ type: 'selectTemplate', mode: templateModal.nextMode });
    }
  }, [templateModal, k8sNameDescriptionData]);

  const handleTemplateSelected = React.useCallback(
    (template: RoleTemplate) => {
      const templateRules: RuleEntry[] = template.rules.map((rule) => ({
        ...rule,
        id: getUniqueId('rule'),
      }));

      if (templateModal.type === 'selectTemplate' && templateModal.mode === 'select') {
        k8sNameDescriptionData.onDataChange('name', template.name);
        k8sNameDescriptionData.onDataChange('k8sName', translateDisplayNameForK8s(template.name));
        setDescription(template.description);
        setLabels([]);
        setRules(templateRules);
      } else {
        setRules((prev) => [...prev, ...templateRules]);
      }

      setTemplateModal({ type: 'none' });
    },
    [templateModal, k8sNameDescriptionData],
  );

  const handleDescriptionChange = React.useCallback((value: string) => {
    setDescription(value);
  }, []);

  const handleLabelsChange = React.useCallback((newLabels: LabelEntry[]) => {
    setLabels(newLabels);
  }, []);

  const handleRulesChange = React.useCallback((newRules: RuleEntry[]) => {
    setRules(newRules);
  }, []);

  const hasDuplicateLabelKeys = React.useMemo(
    () => new Set(labels.map((l) => l.key)).size !== labels.length,
    [labels],
  );

  const hasInvalidLabels =
    labels.some(
      (label) => !label.key || !label.value || !isValidK8sLabelKeyValue(label.key, label.value),
    ) || hasDuplicateLabelKeys;

  const isSubmitDisabled =
    !k8sNameDescriptionData.data.k8sName.value ||
    k8sNameDescriptionData.data.k8sName.state.invalidCharacters ||
    k8sNameDescriptionData.data.k8sName.state.invalidLength ||
    hasInvalidLabels;

  const doSubmit = React.useCallback(async () => {
    setSubmitError(undefined);
    const k8sName = k8sNameDescriptionData.data.k8sName.value;
    const roleDisplayName = k8sNameDescriptionData.data.name || k8sName;
    const preservedLabels = Object.fromEntries(
      Object.entries(existingRole?.metadata.labels ?? {}).filter(
        ([key]) => !key.startsWith(USER_LABEL_PREFIX),
      ),
    );
    const labelRecord = { ...preservedLabels, ...toK8sLabels(labels) };
    const role = assembleRole(namespace, k8sName, roleDisplayName, description, rules, labelRecord);
    try {
      await createRole(role);
      navigate(`/projects/${namespace}?section=roles`);
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to create role');
      setSubmitError(error);
      throw error;
    }
  }, [namespace, k8sNameDescriptionData.data, description, rules, labels, navigate, existingRole]);

  const handleSubmit = React.useCallback(async () => {
    if (rules.length === 0) {
      setShowNoRulesConfirm(true);
      return;
    }
    await doSubmit();
  }, [rules.length, doSubmit]);

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (!allowAccess) {
    return <Navigate to={`/projects/${namespace}?section=roles`} replace />;
  }

  const pageTitle = isEdit ? 'Edit custom role' : 'Create custom role';

  return (
    <>
      <ApplicationsPage
        title={pageTitle}
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbItem render={() => <Link to="/projects">Projects</Link>} />
            <BreadcrumbItem
              render={() => <Link to={`/projects/${namespace}?section=roles`}>{displayName}</Link>}
            />
            <BreadcrumbItem isActive>{pageTitle}</BreadcrumbItem>
          </Breadcrumb>
        }
        description="Create a custom role to control what users can see and do across your cluster resources. Define permissions, navigation access, and resource scopes to implement fine-grained access control."
        headerAction={
          <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
            <Button
              variant="secondary"
              data-testid="select-role-template-button"
              onClick={handleSelectTemplateClick}
            >
              Select role template
            </Button>
            <ToggleGroup aria-label="Form or YAML view toggle" data-testid="form-yaml-toggle">
              <ToggleGroupItem
                text="Form"
                buttonId="form-view-toggle"
                data-testid="form-view-toggle"
                isSelected={viewMode === 'form'}
                onChange={() => setViewMode('form')}
              />
              <ToggleGroupItem
                text="YAML (read-only)"
                buttonId="yaml-view-toggle"
                data-testid="yaml-view-toggle"
                isSelected={viewMode === 'yaml'}
                onChange={() => setViewMode('yaml')}
              />
            </ToggleGroup>
          </Flex>
        }
        loaded
        empty={false}
      >
        <PageSection hasBodyWrapper={false} isFilled data-testid="create-role-page">
          <div hidden={viewMode !== 'form'}>
            <CreateRoleForm
              nameDescriptionData={k8sNameDescriptionData}
              description={description}
              onDescriptionChange={handleDescriptionChange}
              labels={labels}
              onLabelsChange={handleLabelsChange}
              rules={rules}
              onRulesChange={handleRulesChange}
              onImportTemplate={handleImportTemplateClick}
            />
          </div>
          {viewMode === 'yaml' && (
            <CreateRoleYamlView
              namespace={namespace}
              k8sName={k8sNameDescriptionData.data.k8sName.value}
              displayName={
                k8sNameDescriptionData.data.name || k8sNameDescriptionData.data.k8sName.value
              }
              description={description}
              rules={rules}
              labels={labels}
            />
          )}
        </PageSection>
        <PageSection hasBodyWrapper={false} stickyOnBreakpoint={{ default: 'bottom' }}>
          <CreateRoleFooter
            namespace={namespace}
            isSubmitDisabled={isSubmitDisabled}
            isEdit={isEdit}
            onSubmit={handleSubmit}
            submitError={submitError}
          />
        </PageSection>
      </ApplicationsPage>
      {showNoRulesConfirm && (
        <CreateRoleConfirmModal onConfirm={doSubmit} onClose={() => setShowNoRulesConfirm(false)} />
      )}
      {templateModal.type === 'discardConfirm' && (
        <DiscardChangesConfirmModal
          onDiscard={handleDiscardConfirm}
          onClose={() => setTemplateModal({ type: 'none' })}
        />
      )}
      {templateModal.type === 'selectTemplate' && (
        <SelectTemplateModal
          mode={templateModal.mode}
          onSelectTemplate={handleTemplateSelected}
          onClose={() => setTemplateModal({ type: 'none' })}
        />
      )}
    </>
  );
};

export default CreateRolePage;
