import * as React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import AllSubscriptionsPage from '~/app/pages/subscriptions/AllSubscriptionsPage';
import ViewSubscriptionPage from '~/app/pages/subscriptions/ViewSubscriptionPage';
import EditSubscriptionPage from '~/app/pages/subscriptions/EditSubscriptionPage';
import CreateSubscriptionPage from '~/app/pages/subscriptions/CreateSubscriptionPage';
import AllApiKeysPage from '~/app/pages/api-keys/AllApiKeysPage';
import { URL_PREFIX } from '~/app/utilities/const';
import AllAuthPoliciesPage from '~/app/pages/auth-policies/AllAuthPoliciesPage';
import CreateAuthPolicyPage from '~/app/pages/auth-policies/CreateAuthPolicyPage';
import EditAuthPolicyPage from '~/app/pages/auth-policies/EditAuthPolicyPage';
import ViewAuthPoliciesPage from '~/app/pages/auth-policies/ViewAuthPoliciesPage';
import AllEndpointsPage from '~/app/pages/endpoints/AllEndpointsPage';
import CreateEndpointsPage from '~/app/pages/endpoints/CreateEndpointsPage';
import EditEndpointsPage from '~/app/pages/endpoints/EditEndpointsPage';

export const EndpointsTabRoutes: React.FC = () => (
  <Routes>
    <Route index element={<AllEndpointsPage />} />
    <Route path="create" element={<CreateEndpointsPage />} />
    <Route path="edit/:endpointName" element={<EditEndpointsPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const AppRoutes: React.FC = () => {
  const { pathname } = useLocation();
  const isSubscriptions = pathname.startsWith(`${URL_PREFIX}/subscriptions`);
  const isAuthPolicies = pathname.startsWith(`${URL_PREFIX}/auth-policies`);
  const isEndpoints = pathname.startsWith(`${URL_PREFIX}/maas-endpoints`);
  if (isAuthPolicies) {
    return (
      <Routes>
        <Route path="/" element={<AllAuthPoliciesPage />} />
        <Route path="/create" element={<CreateAuthPolicyPage />} />
        <Route path="/view/:authPolicyName" element={<ViewAuthPoliciesPage />} />
        <Route path="/edit/:authPolicyName" element={<EditAuthPolicyPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }
  if (isSubscriptions) {
    return (
      <Routes>
        <Route path="/" element={<AllSubscriptionsPage />} />
        <Route path="/create" element={<CreateSubscriptionPage />} />
        <Route path="/view/:subscriptionName" element={<ViewSubscriptionPage />} />
        <Route path="/edit/:subscriptionName" element={<EditSubscriptionPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }
  if (isEndpoints) {
    return <EndpointsTabRoutes />;
  }

  return (
    <Routes>
      <Route path="/" element={<AllApiKeysPage />} />
      <Route path="*" element={<Navigate to={`${URL_PREFIX}/tokens`} replace />} />
    </Routes>
  );
};

export default AppRoutes;
