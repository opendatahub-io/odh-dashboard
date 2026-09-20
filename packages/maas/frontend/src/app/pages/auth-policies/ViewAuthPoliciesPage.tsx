import * as React from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApplicationsPage, TrackingOutcome } from '@odh-dashboard/ui-core';
import {
  Breadcrumb,
  BreadcrumbItem,
  PageSection,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import SimpleMenuActions from '@odh-dashboard/internal/components/SimpleMenuActions';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { useGetPolicyInfo } from '~/app/hooks/useGetPolicyInfo';
import { MaaSAuthPolicy, MaaSModelRefSummary } from '~/app/types/subscriptions';
import { PolicyInfoResponse } from '~/app/types/auth-policies';
import {
  getAuthPolicyEditUrl,
  getBackUrl,
  getBreadcrumbLabelFromState,
  getSectionUrl,
} from '~/app/utilities/maasGovernanceNavigation';
import MaasModelsSection from '~/app/shared/MaasModelsSection';
import {
  EventTrackingResourceType,
  EventTrackingSource,
  EventTrackingEditSource,
  MaaSEvents,
  EventTrackingContext,
  MaaSResourceDeletedProperties,
  MaaSGovernanceYamlViewedProperties,
} from '~/app/types/event-tracking';
import { modelRefsToSummaries } from '~/app/utilities/authpolicies';
import MaaSGovernanceYamlTab from '~/app/pages/maas-governance/MaaSGovernanceYamlTab';
import DeleteAuthPolicyModal from './DeleteAuthPolicyModal';
import PolicyDetailsSection from './viewAuthPolicy/PolicyDetailsSection';
import PolicyGroupsSection from './viewAuthPolicy/PolicyGroupsSection';

type PolicyActionsProps = {
  policy: MaaSAuthPolicy;
  returnTo?: string;
};

const viewModelRefSummaries = (info: PolicyInfoResponse): MaaSModelRefSummary[] =>
  modelRefsToSummaries(
    Array.isArray(info.policy.modelRefs) ? info.policy.modelRefs : [],
    Array.isArray(info.modelRefs) ? info.modelRefs : [],
  );

const PolicyActions: React.FC<PolicyActionsProps> = ({ policy, returnTo }) => {
  const navigate = useNavigate();
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const backUrl = returnTo ?? getSectionUrl('auth-policies');
  const navState = returnTo
    ? { state: { returnTo, editSource: EventTrackingEditSource.DETAIL_KEBAB } }
    : undefined;

  return (
    <>
      <SimpleMenuActions
        testId="policy-actions-toggle"
        dropdownItems={[
          {
            key: 'edit',
            label: 'Edit',
            onClick: () => navigate(getAuthPolicyEditUrl(policy.name), navState),
            isDisabled: !!policy.deletionTimestamp,
          },
          { isSpacer: true },
          {
            key: 'delete',
            label: 'Delete',
            onClick: () => setIsDeleteOpen(true),
            isDisabled: !!policy.deletionTimestamp,
          },
        ]}
      />
      {isDeleteOpen && (
        <DeleteAuthPolicyModal
          authPolicy={policy}
          onClose={(deleted) => {
            setIsDeleteOpen(false);
            if (deleted) {
              fireFormTrackingEvent(MaaSEvents.MAAS_RESOURCE_DELETED, {
                resourceType: EventTrackingResourceType.AUTHPOLICY,
                source: EventTrackingSource.DETAIL_KEBAB,
                resourceStatus: policy.phase ?? '',
                outcome: TrackingOutcome.submit,
              } satisfies MaaSResourceDeletedProperties);
              navigate(backUrl);
            } else {
              fireFormTrackingEvent(MaaSEvents.MAAS_RESOURCE_DELETED, {
                resourceType: EventTrackingResourceType.AUTHPOLICY,
                source: EventTrackingSource.DETAIL_KEBAB,
                resourceStatus: policy.phase ?? '',
                outcome: TrackingOutcome.cancel,
              } satisfies MaaSResourceDeletedProperties);
            }
          }}
        />
      )}
    </>
  );
};

const ViewAuthPoliciesPage: React.FC = () => {
  const { authPolicyName = '' } = useParams<{ authPolicyName: string }>();
  const location = useLocation();
  const [activeTab, setActiveTab] = React.useState<string | number>('details');
  const [policyInfo, loaded, loadError] = useGetPolicyInfo(authPolicyName);

  const backUrl = getBackUrl(location.state, 'auth-policies');
  const breadcrumbLabel = getBreadcrumbLabelFromState(location.state) ?? 'Authorization policies';

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbItem>
        <Link to={backUrl} data-testid="breadcrumb-policies-link">
          {breadcrumbLabel}
        </Link>
      </BreadcrumbItem>
      <BreadcrumbItem isActive>{policyInfo?.policy.displayName ?? authPolicyName}</BreadcrumbItem>
    </Breadcrumb>
  );

  return (
    <ApplicationsPage
      title={policyInfo?.policy.displayName ?? authPolicyName}
      breadcrumb={breadcrumb}
      headerAction={policyInfo && <PolicyActions policy={policyInfo.policy} returnTo={backUrl} />}
      empty={false}
      loaded={loaded || !!loadError}
      loadError={loadError}
      errorMessage="Unable to load policy details."
    >
      {loaded && policyInfo && (
        <Tabs
          activeKey={activeTab}
          aria-label="Policy detail tabs"
          inset={{ default: 'insetNone' }}
          onSelect={(_event, key) => {
            setActiveTab(key);
            if (key === 'yaml') {
              fireMiscTrackingEvent(MaaSEvents.MAAS_GOVERNANCE_YAML_VIEWED, {
                resourceType: EventTrackingResourceType.AUTHPOLICY,
                context: EventTrackingContext.DETAILS,
              } satisfies MaaSGovernanceYamlViewedProperties);
            }
          }}
        >
          <Tab
            eventKey="details"
            title={<TabTitleText>Details</TabTitleText>}
            aria-label="Policy details tab"
            data-testid="policy-details-tab"
          >
            <PageSection hasBodyWrapper={false} className="pf-v6-u-pb-xl">
              <PolicyDetailsSection
                policy={policyInfo.policy}
                modelRefs={viewModelRefSummaries(policyInfo)}
              />
            </PageSection>
            <PageSection hasBodyWrapper={false} className="pf-v6-u-pb-xl">
              <PolicyGroupsSection groups={policyInfo.policy.subjects.groups ?? []} />
            </PageSection>
            <PageSection hasBodyWrapper={false} className="pf-v6-u-pb-xl">
              <MaasModelsSection
                modelRefSummaries={viewModelRefSummaries(policyInfo)}
                hideColumns={['tokenLimits']}
                resourceType="authorization policy"
              />
            </PageSection>
          </Tab>
          <Tab
            eventKey="yaml"
            title={<TabTitleText>YAML</TabTitleText>}
            aria-label="YAML tab"
            data-testid="policy-yaml-tab"
          >
            <MaaSGovernanceYamlTab
              resourceName={authPolicyName}
              resourceType="authorizationpolicy"
            />
          </Tab>
        </Tabs>
      )}
    </ApplicationsPage>
  );
};

export default ViewAuthPoliciesPage;
