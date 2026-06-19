import * as React from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import {
  Breadcrumb,
  BreadcrumbItem,
  PageSection,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import SimpleMenuActions from '@odh-dashboard/internal/components/SimpleMenuActions';
import { useGetPolicyInfo } from '~/app/hooks/useGetPolicyInfo';
import { MaaSAuthPolicy, MaaSModelRefSummary } from '~/app/types/subscriptions';
import { PolicyInfoResponse } from '~/app/types/auth-policies';
import { URL_PREFIX } from '~/app/utilities/const';
import { getBackUrl } from '~/app/utilities/subscriptionManagementNavigation';
import MaasModelsSection from '~/app/shared/MaasModelsSection';
import DeleteAuthPolicyModal from './DeleteAuthPolicyModal';
import PolicyDetailsSection from './viewAuthPolicy/PolicyDetailsSection';
import PolicyGroupsSection from './viewAuthPolicy/PolicyGroupsSection';

type PolicyActionsProps = {
  policy: MaaSAuthPolicy;
  returnTo?: string;
};

const viewModelRefSummaries = (info: PolicyInfoResponse): MaaSModelRefSummary[] => {
  const policyRefs = Array.isArray(info.policy.modelRefs) ? info.policy.modelRefs : [];
  const modelRefSummaries = Array.isArray(info.modelRefs) ? info.modelRefs : [];

  return policyRefs.map((ref) => {
    const summary = modelRefSummaries.find(
      (s) => s.name === ref.name && s.namespace === ref.namespace,
    );
    return (
      summary ?? {
        name: ref.name,
        namespace: ref.namespace,
        modelRef: { kind: '', name: ref.name },
      }
    );
  });
};

const PolicyActions: React.FC<PolicyActionsProps> = ({ policy, returnTo }) => {
  const navigate = useNavigate();
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const base = returnTo ?? `${URL_PREFIX}/auth-policies`;
  const navState = returnTo ? { state: { returnTo } } : undefined;

  return (
    <>
      <SimpleMenuActions
        testId="policy-actions-toggle"
        dropdownItems={[
          {
            key: 'edit',
            label: 'Edit',
            onClick: () => navigate(`${base}/edit/${encodeURIComponent(policy.name)}`, navState),
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
              navigate(base);
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

  const backUrl = getBackUrl(location.pathname, location.state, 'auth-policies');

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbItem>
        <Link to={backUrl} data-testid="breadcrumb-policies-link">
          Authorization policies
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
          onSelect={(_event, key) => setActiveTab(key)}
          aria-label="Policy detail tabs"
          inset={{ default: 'insetNone' }}
        >
          <Tab
            eventKey="details"
            title={<TabTitleText>Details</TabTitleText>}
            aria-label="Policy details tab"
            data-testid="policy-details-tab"
          >
            <PageSection hasBodyWrapper={false} className="pf-v6-u-pb-xl">
              <PolicyDetailsSection policy={policyInfo.policy} />
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
        </Tabs>
      )}
    </ApplicationsPage>
  );
};

export default ViewAuthPoliciesPage;
