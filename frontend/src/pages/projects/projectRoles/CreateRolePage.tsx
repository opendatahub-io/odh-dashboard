import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  PageSection,
  Spinner,
  getUniqueId,
} from '@patternfly/react-core';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { useAccessReview } from '#~/api/useAccessReview';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { getDisplayNameFromK8sResource, isValidK8sLabelKeyValue } from '#~/concepts/k8s/utils';
import { useK8sNameDescriptionFieldData } from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { RoleKind } from '#~/k8sTypes';
import { createRole } from '#~/api';
import CreateRoleForm from './CreateRoleForm';
import CreateRoleFooter from './CreateRoleFooter';
import CreateRoleConfirmModal from './CreateRoleConfirmModal';
import assembleRole from './assembleRole';
import type { LabelEntry, RuleEntry } from './types';

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
  const [labels, setLabels] = React.useState<LabelEntry[]>(() => {
    if (!existingRole?.metadata.labels) {
      return [];
    }
    return Object.entries(existingRole.metadata.labels).map(([key, value]) => ({
      id: getUniqueId('label'),
      key,
      value,
    }));
  });
  const [rules, setRules] = React.useState<RuleEntry[]>(() => {
    if (!existingRole?.rules) {
      return [];
    }
    return existingRole.rules.map((rule) => ({
      ...rule,
      id: getUniqueId('rule'),
    }));
  });

  const [submitError, setSubmitError] = React.useState<Error>();
  const [showNoRulesConfirm, setShowNoRulesConfirm] = React.useState(false);

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
    const labelRecord = Object.fromEntries(labels.map((l) => [l.key, l.value]));
    const role = assembleRole(namespace, k8sName, roleDisplayName, description, rules, labelRecord);
    try {
      await createRole(role);
      navigate(`/projects/${namespace}?section=roles`);
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Failed to create role');
      setSubmitError(error);
      throw error;
    }
  }, [namespace, k8sNameDescriptionData.data, description, rules, labels, navigate]);

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
          // TODO: Enable when template selection modal is implemented (RHOAIENG-63156)
          <Button variant="secondary" data-testid="select-role-template-button" isDisabled>
            Select role template
          </Button>
        }
        loaded
        empty={false}
      >
        <PageSection hasBodyWrapper={false} isFilled data-testid="create-role-page">
          <CreateRoleForm
            nameDescriptionData={k8sNameDescriptionData}
            description={description}
            onDescriptionChange={handleDescriptionChange}
            labels={labels}
            onLabelsChange={handleLabelsChange}
            rules={rules}
            onRulesChange={handleRulesChange}
          />
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
    </>
  );
};

export default CreateRolePage;
