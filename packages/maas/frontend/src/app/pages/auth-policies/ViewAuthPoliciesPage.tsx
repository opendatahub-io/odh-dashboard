import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
import { MaaSAuthPolicy } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import MaasModelsSection from '~/app/shared/MaasModelsSection';
import DeleteAuthPolicyModal from './DeleteAuthPolicyModal';
import PolicyDetailsSection from './viewAuthPolicy/PolicyDetailsSection';
import PolicyGroupsSection from './viewAuthPolicy/PolicyGroupsSection';

type PolicyActionsProps = {
  policy: MaaSAuthPolicy;
};

const PolicyActions: React.FC<PolicyActionsProps> = ({ policy }) => {
  const navigate = useNavigate();
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  return (
    <>
      <SimpleMenuActions
        testId="policy-actions-toggle"
        dropdownItems={[
          {
            key: 'edit',
            label: 'Edit policy',
            onClick: () =>
              navigate(`${URL_PREFIX}/auth-policies/edit/${encodeURIComponent(policy.name)}`),
          },
          { isSpacer: true },
          {
            key: 'delete',
            label: 'Delete policy',
            onClick: () => setIsDeleteOpen(true),
          },
        ]}
      />
      {isDeleteOpen && (
        <DeleteAuthPolicyModal
          authPolicy={policy}
          onClose={(deleted) => {
            setIsDeleteOpen(false);
            if (deleted) {
              navigate(`${URL_PREFIX}/auth-policies`);
            }
          }}
        />
      )}
    </>
  );
};

const ViewAuthPoliciesPage: React.FC = () => {
  const { authPolicyName = '' } = useParams<{ authPolicyName: string }>();
  const [activeTab, setActiveTab] = React.useState<string | number>('details');
  const [policyInfo, loaded, loadError] = useGetPolicyInfo(authPolicyName);

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbItem>
        <Link to={`${URL_PREFIX}/auth-policies`} data-testid="breadcrumb-policies-link">
          Policies
        </Link>
      </BreadcrumbItem>
      <BreadcrumbItem isActive>{policyInfo?.policy.displayName ?? authPolicyName}</BreadcrumbItem>
    </Breadcrumb>
  );

  return (
    <ApplicationsPage
      title={policyInfo?.policy.displayName ?? authPolicyName}
      breadcrumb={breadcrumb}
      headerAction={policyInfo && <PolicyActions policy={policyInfo.policy} />}
      empty={false}
      loaded={loaded}
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
                modelRefSummaries={policyInfo.modelRefs}
                hideColumns={['tokenLimits']}
              />
            </PageSection>
          </Tab>
        </Tabs>
      )}
    </ApplicationsPage>
  );
};

export default ViewAuthPoliciesPage;
