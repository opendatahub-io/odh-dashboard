import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  Content,
  Divider,
  Flex,
  FlexItem,
  PageSection,
  Spinner,
  Title,
  ToggleGroup,
  ToggleGroupItem,
  getUniqueId,
} from '@patternfly/react-core';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { getDisplayNameFromK8sResource, translateDisplayNameForK8s } from '@odh-dashboard/k8s-core';
import { useK8sNameDescriptionFieldData } from '@odh-dashboard/ui-core/components/K8sNameDescriptionField';
import { ApplicationsPage, TrackingOutcome } from '@odh-dashboard/ui-core';
import { useAccessReview } from '@odh-dashboard/plugin-core/host-api';
import { createRole } from '@odh-dashboard/k8s-core/api/roles';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { RoleKind } from '#~/k8sTypes';
import { updateRole } from '#~/api';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '#~/concepts/analyticsTracking/segmentIOUtils';
import CreateRoleForm from './CreateRoleForm';
import CreateRoleFooter from './CreateRoleFooter';
import CreateRoleConfirmModal from './CreateRoleConfirmModal';
import CreateRoleYamlView from './CreateRoleYamlView';
import ReplaceContentConfirmModal from './ReplaceContentConfirmModal';
import SelectTemplateModal from './SelectTemplateModal';
import type { RoleTemplate } from './roleTemplateCatalog';
import { CUSTOM_ROLE_TRACKING_EVENTS, findTemplateCategoryId } from './trackingUtils';
import assembleRole from './assembleRole';
import { fromK8sLabels, toK8sLabels } from './labelUtils';
import { USER_LABEL_PREFIX } from './const';
import type { LabelEntry, RuleEntry } from './types';

enum ViewMode {
  Form = 'form',
  Yaml = 'yaml',
}

type TemplateModalState =
  | { type: 'none' }
  | { type: 'confirmReplace'; template: RoleTemplate }
  | { type: 'selectTemplate'; mode: 'select' | 'addRules' };

type CreateRolePageProps = {
  existingRole?: RoleKind;
  duplicateRole?: RoleKind;
};

type TitleWithViewToggleProps = {
  title: string;
  description?: React.ReactNode;
  viewMode: ViewMode;
  onViewChange: (newView: ViewMode) => void;
};

const TitleWithViewToggle: React.FC<TitleWithViewToggleProps> = ({
  title,
  description,
  viewMode,
  onViewChange,
}) => {
  return (
    <Flex
      alignItems={{ default: 'alignItemsFlexStart' }}
      justifyContent={{ default: 'justifyContentSpaceBetween' }}
    >
      <FlexItem flex={{ default: 'flex_1' }}>
        <Title
          data-testid={`${viewMode}-view-title`}
          className="pf-v6-u-mb-sm"
          headingLevel="h2"
          size="md"
        >
          {title}
        </Title>
        {description && (
          <Content component="p" data-testid={`${viewMode}-view-description`}>
            {description}
          </Content>
        )}
      </FlexItem>
      <ToggleGroup aria-label="Form or YAML view toggle" data-testid="form-yaml-toggle">
        <ToggleGroupItem
          text="Form"
          buttonId="form-view-toggle"
          data-testid="form-view-toggle"
          isSelected={viewMode === ViewMode.Form}
          onChange={() => onViewChange(ViewMode.Form)}
        />
        <ToggleGroupItem
          text="YAML (read-only)"
          buttonId="yaml-view-toggle"
          data-testid="yaml-view-toggle"
          isSelected={viewMode === ViewMode.Yaml}
          onChange={() => onViewChange(ViewMode.Yaml)}
        />
      </ToggleGroup>
    </Flex>
  );
};

const CreateRolePage: React.FC<CreateRolePageProps> = ({ existingRole, duplicateRole }) => {
  const { namespace = '' } = useParams<{ namespace: string }>();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const displayName = getDisplayNameFromK8sResource(currentProject);
  const isEdit = !!existingRole;
  const isDuplicate = !!duplicateRole;
  const initialRole = existingRole ?? duplicateRole;
  const navigate = useNavigate();

  const [allowAccess, loaded] = useAccessReview({
    group: 'rbac.authorization.k8s.io',
    resource: 'roles',
    namespace,
    verb: isEdit ? 'update' : 'create',
  });

  const k8sNameDescriptionData = useK8sNameDescriptionFieldData({
    initialData: initialRole,
  });
  const [description, setDescription] = React.useState(
    () => initialRole?.metadata.annotations?.['openshift.io/description'] ?? '',
  );
  const [labels, setLabels] = React.useState<LabelEntry[]>(() =>
    fromK8sLabels(initialRole?.metadata.labels),
  );
  const [rules, setRules] = React.useState<RuleEntry[]>(() => {
    if (!initialRole?.rules) {
      return [];
    }
    return initialRole.rules.map((rule) => ({
      ...rule,
      id: getUniqueId('rule'),
    }));
  });

  const [viewMode, setViewMode] = React.useState<ViewMode>(ViewMode.Form);
  const [submitError, setSubmitError] = React.useState<Error>();
  const [showNoRulesConfirm, setShowNoRulesConfirm] = React.useState(false);
  const [templateModal, setTemplateModal] = React.useState<TemplateModalState>({ type: 'none' });

  const pageEntryTimeRef = React.useRef(Date.now());
  const [yamlPreviewed, setYamlPreviewed] = React.useState(false);
  const yamlExportActionsRef = React.useRef<Set<string>>(new Set());
  const [templateUsed, setTemplateUsed] = React.useState(false);
  const [lastTemplateId, setLastTemplateId] = React.useState<string | undefined>();

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

  const handleViewModeChange = React.useCallback(
    (targetView: ViewMode) => {
      if (targetView === viewMode) {
        return;
      }
      fireMiscTrackingEvent(CUSTOM_ROLE_TRACKING_EVENTS.VIEW_TOGGLED, {
        targetView,
        sourceView: viewMode,
      });
      if (targetView === ViewMode.Yaml) {
        setYamlPreviewed(true);
      }
      setViewMode(targetView);
    },
    [viewMode],
  );

  const handleYamlExportAction = React.useCallback((action: 'copy' | 'download') => {
    yamlExportActionsRef.current.add(action);
  }, []);

  const handleImportRoleTemplateClick = React.useCallback(() => {
    setTemplateModal({ type: 'selectTemplate', mode: 'select' });
  }, []);

  const handleImportTemplateClick = React.useCallback(() => {
    setTemplateModal({ type: 'selectTemplate', mode: 'addRules' });
  }, []);

  const handleConfirmReplace = React.useCallback(() => {
    if (templateModal.type === 'confirmReplace') {
      const { template } = templateModal;
      const hadExistingRules = rules.length > 0;
      const templateRules: RuleEntry[] = template.rules.map((rule) => ({
        ...rule,
        id: getUniqueId('rule'),
      }));
      k8sNameDescriptionData.onDataChange('name', template.name);
      k8sNameDescriptionData.onDataChange('k8sName', translateDisplayNameForK8s(template.name));
      setDescription(template.description);
      setRules(templateRules);
      setSubmitError(undefined);

      fireMiscTrackingEvent(CUSTOM_ROLE_TRACKING_EVENTS.TEMPLATE_SELECTED, {
        templateId: template.id,
        templateName: template.name,
        templateCategory: findTemplateCategoryId(template.id) ?? 'unknown',
        mode: 'select',
        rulesAdded: template.rules.length,
        hadExistingRules,
      });
      setTemplateUsed(true);
      setLastTemplateId(template.id);

      setTemplateModal({ type: 'none' });
    }
  }, [templateModal, k8sNameDescriptionData, rules.length]);

  const handleTemplateSelected = React.useCallback(
    (template: RoleTemplate) => {
      const mode = templateModal.type === 'selectTemplate' ? templateModal.mode : 'select';
      const hadExistingRules = rules.length > 0;

      if (templateModal.type === 'selectTemplate' && templateModal.mode === 'select') {
        if (isFormDirty) {
          setTemplateModal({ type: 'confirmReplace', template });
          return;
        }
        const templateRules: RuleEntry[] = template.rules.map((rule) => ({
          ...rule,
          id: getUniqueId('rule'),
        }));
        k8sNameDescriptionData.onDataChange('name', template.name);
        k8sNameDescriptionData.onDataChange('k8sName', translateDisplayNameForK8s(template.name));
        setDescription(template.description);
        setRules(templateRules);
      } else {
        const templateRules: RuleEntry[] = template.rules.map((rule) => ({
          ...rule,
          id: getUniqueId('rule'),
        }));
        setRules((prev) => [...prev, ...templateRules]);
      }

      fireMiscTrackingEvent(CUSTOM_ROLE_TRACKING_EVENTS.TEMPLATE_SELECTED, {
        templateId: template.id,
        templateName: template.name,
        templateCategory: findTemplateCategoryId(template.id) ?? 'unknown',
        mode,
        rulesAdded: template.rules.length,
        hadExistingRules,
      });
      setTemplateUsed(true);
      setLastTemplateId(template.id);

      setTemplateModal({ type: 'none' });
    },
    [templateModal, k8sNameDescriptionData, isFormDirty, rules.length],
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

  const [hasInvalidLabels, setHasInvalidLabels] = React.useState(false);

  const isSubmitDisabled =
    !k8sNameDescriptionData.data.k8sName.value ||
    k8sNameDescriptionData.data.k8sName.state.invalidCharacters ||
    k8sNameDescriptionData.data.k8sName.state.invalidLength ||
    hasInvalidLabels;

  const getFormTrackingProperties = React.useCallback(
    () => ({
      yamlPreviewed,
      yamlExportActions: JSON.stringify([...yamlExportActionsRef.current]),
      totalTimeOnPageMs: Date.now() - pageEntryTimeRef.current,
      totalRulesCount: rules.length,
      currentView: viewMode,
      templateUsed,
      templateId: lastTemplateId ?? '',
    }),
    [yamlPreviewed, rules.length, viewMode, templateUsed, lastTemplateId],
  );

  const doSubmit = React.useCallback(async () => {
    setSubmitError(undefined);
    const k8sName = k8sNameDescriptionData.data.k8sName.value;
    const roleDisplayName = k8sNameDescriptionData.data.name || k8sName;
    const preservedLabels = Object.fromEntries(
      Object.entries(initialRole?.metadata.labels ?? {}).filter(
        ([key]) => !key.startsWith(USER_LABEL_PREFIX),
      ),
    );
    const labelRecord = { ...preservedLabels, ...toK8sLabels(labels) };
    const role = assembleRole(namespace, k8sName, roleDisplayName, description, rules, labelRecord);
    try {
      if (existingRole) {
        await updateRole({
          ...role,
          metadata: {
            ...role.metadata,
            resourceVersion: existingRole.metadata.resourceVersion,
          },
        });
      } else {
        await createRole(role);
      }
      try {
        fireFormTrackingEvent(CUSTOM_ROLE_TRACKING_EVENTS.FORM_SUBMITTED, {
          outcome: TrackingOutcome.submit,
          success: true,
          ...getFormTrackingProperties(),
        });
      } catch {
        // best-effort — analytics must not block a successful save
      }
      navigate(`/projects/${namespace}?section=roles`);
    } catch (e) {
      const error =
        e instanceof Error
          ? e
          : new Error(existingRole ? 'Failed to update role' : 'Failed to create role');
      try {
        fireFormTrackingEvent(CUSTOM_ROLE_TRACKING_EVENTS.FORM_SUBMITTED, {
          outcome: TrackingOutcome.submit,
          success: false,
          errorCode: existingRole ? 'role_update_failed' : 'role_create_failed',
          ...getFormTrackingProperties(),
        });
      } catch {
        // best-effort — preserve the original API error
      }
      setSubmitError(error);
      throw error;
    }
  }, [
    namespace,
    k8sNameDescriptionData.data,
    description,
    rules,
    labels,
    navigate,
    existingRole,
    initialRole?.metadata.labels,
    getFormTrackingProperties,
  ]);

  const handleSubmit = React.useCallback(async () => {
    if (rules.length === 0) {
      setShowNoRulesConfirm(true);
      return;
    }
    await doSubmit();
  }, [rules.length, doSubmit]);

  const handleCancel = React.useCallback(() => {
    fireFormTrackingEvent(CUSTOM_ROLE_TRACKING_EVENTS.FORM_SUBMITTED, {
      outcome: TrackingOutcome.cancel,
      ...getFormTrackingProperties(),
    });
  }, [getFormTrackingProperties]);

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

  const pageTitle = isEdit
    ? 'Edit custom role'
    : isDuplicate
    ? 'Duplicate custom role'
    : 'Create a role';

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
        description="Define what actions users with this role can perform on project resources."
        headerAction={
          <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
            <Button
              variant="secondary"
              data-testid="select-role-template-button"
              onClick={handleImportRoleTemplateClick}
            >
              Import role template
            </Button>
          </Flex>
        }
        loaded
        empty={false}
      >
        <Divider />
        <PageSection hasBodyWrapper={false} isFilled data-testid="create-role-page">
          {viewMode === ViewMode.Form ? (
            <>
              <TitleWithViewToggle
                title="Role configuration"
                onViewChange={handleViewModeChange}
                viewMode={viewMode}
              />
              <CreateRoleForm
                nameDescriptionData={k8sNameDescriptionData}
                description={description}
                onDescriptionChange={handleDescriptionChange}
                labels={labels}
                onLabelsChange={handleLabelsChange}
                onHasInvalidLabelsChange={setHasInvalidLabels}
                rules={rules}
                onRulesChange={handleRulesChange}
                onImportTemplate={handleImportTemplateClick}
              />
            </>
          ) : (
            <>
              <TitleWithViewToggle
                title="Role configuration YAML"
                description={
                  <>
                    View the live, read-only YAML for this role. This preview automatically updates
                    to reflect changes you make in <strong>Form</strong> view.
                  </>
                }
                onViewChange={handleViewModeChange}
                viewMode={viewMode}
              />
              <CreateRoleYamlView
                namespace={namespace}
                k8sName={k8sNameDescriptionData.data.k8sName.value}
                displayName={
                  k8sNameDescriptionData.data.name || k8sNameDescriptionData.data.k8sName.value
                }
                description={description}
                rules={rules}
                labels={labels}
                onExportAction={handleYamlExportAction}
              />
            </>
          )}
        </PageSection>
        <PageSection hasBodyWrapper={false} stickyOnBreakpoint={{ default: 'bottom' }}>
          <CreateRoleFooter
            namespace={namespace}
            isSubmitDisabled={isSubmitDisabled}
            isEdit={isEdit}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            submitError={submitError}
          />
        </PageSection>
      </ApplicationsPage>
      {showNoRulesConfirm && (
        <CreateRoleConfirmModal onConfirm={doSubmit} onClose={() => setShowNoRulesConfirm(false)} />
      )}
      {templateModal.type === 'confirmReplace' && (
        <ReplaceContentConfirmModal
          onConfirm={handleConfirmReplace}
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
