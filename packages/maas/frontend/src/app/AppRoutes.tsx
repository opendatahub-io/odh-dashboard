import * as React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import AllSubscriptionsPage from '~/app/pages/subscriptions/AllSubscriptionsPage';
import ViewSubscriptionPage from '~/app/pages/subscriptions/ViewSubscriptionPage';
import EditSubscriptionPage from '~/app/pages/subscriptions/EditSubscriptionPage';
import CreateSubscriptionPage from '~/app/pages/subscriptions/CreateSubscriptionPage';
import AllApiKeysPage from '~/app/pages/api-keys/AllApiKeysPage';
import { URL_PREFIX } from '~/app/utilities/const';

const AppRoutes: React.FC = () => {
  const { pathname } = useLocation();
  const isSubscriptions = pathname.startsWith(`${URL_PREFIX}/subscriptions`);

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

  return (
    <Routes>
      <Route path="/" element={<AllApiKeysPage />} />
      <Route path="*" element={<Navigate to={`${URL_PREFIX}/tokens`} replace />} />
    </Routes>
  );
};

export default AppRoutes;
