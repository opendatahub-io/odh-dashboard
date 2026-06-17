import * as React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import AllSubscriptionsPage from '~/app/pages/subscriptions/AllSubscriptionsPage';
import ViewSubscriptionPage from '~/app/pages/subscriptions/ViewSubscriptionPage';
import EditSubscriptionPage from '~/app/pages/subscriptions/EditSubscriptionPage';
import CreateSubscriptionPage from '~/app/pages/subscriptions/CreateSubscriptionPage';
import AllApiKeysPage from '~/app/pages/keys-and-subs/apiKeys/AllApiKeysPage';
import ApiKeysAndSubscriptionsPage from '~/app/pages/keys-and-subs/ApiKeysAndSubscriptionsPage';
import { URL_PREFIX } from '~/app/utilities/const';
import AllAuthPoliciesPage from '~/app/pages/auth-policies/AllAuthPoliciesPage';
import CreateAuthPolicyPage from '~/app/pages/auth-policies/CreateAuthPolicyPage';
import EditAuthPolicyPage from '~/app/pages/auth-policies/EditAuthPolicyPage';
import ViewAuthPoliciesPage from '~/app/pages/auth-policies/ViewAuthPoliciesPage';
import ViewMySubscriptionPage from './pages/keys-and-subs/mySubscriptions/ViewMySubscriptionPage';
import SubscriptionManagementPage from './pages/subscription-management/SubscriptionManagementPage';

const AppRoutes: React.FC = () => {
  const { pathname } = useLocation();
  const isKeysAndSubs = pathname.startsWith(`${URL_PREFIX}/keys-and-subs`);
  const isSubscriptions = pathname.startsWith(`${URL_PREFIX}/subscriptions`);
  const isAuthPolicies = pathname.startsWith(`${URL_PREFIX}/auth-policies`);
  const isSubscriptionManagement = pathname.startsWith(`${URL_PREFIX}/subscription-management`);

  if (isSubscriptionManagement) {
    return (
      <Routes>
        <Route path="/" element={<SubscriptionManagementPage />} />
        <Route path="/:tab" element={<SubscriptionManagementPage />} />
        <Route path="/subscriptions/create" element={<CreateSubscriptionPage />} />
        <Route path="/subscriptions/view/:subscriptionName" element={<ViewSubscriptionPage />} />
        <Route path="/subscriptions/edit/:subscriptionName" element={<EditSubscriptionPage />} />
        <Route path="/auth-policies/create" element={<CreateAuthPolicyPage />} />
        <Route path="/auth-policies/view/:authPolicyName" element={<ViewAuthPoliciesPage />} />
        <Route path="/auth-policies/edit/:authPolicyName" element={<EditAuthPolicyPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }
  // TODO:Remove old routes when preparing feature for release
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
  // TODO:Remove old routes when preparing feature for release
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
  if (isKeysAndSubs) {
    return (
      <Routes>
        <Route path="/" element={<ApiKeysAndSubscriptionsPage />} />
        <Route path="/:tab" element={<ApiKeysAndSubscriptionsPage />} />
        <Route path="/subscriptions/:subscriptionName" element={<ViewMySubscriptionPage />} />
        <Route path="*" element={<Navigate to={`${URL_PREFIX}/keys-and-subs`} replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<AllApiKeysPage />} />
      <Route path="*" element={<Navigate to={`${URL_PREFIX}/tokens`} replace />} />
    </Routes>
  );
};

export default AppRoutes;
