import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import NotFound from '@odh-dashboard/internal/pages/NotFound';
import AllSubscriptionsPage from '~/app/pages/subscriptions/AllSubscriptionsPage';
import ViewSubscriptionPage from '~/app/pages/subscriptions/ViewSubscriptionPage';
import EditSubscriptionPage from '~/app/pages/subscriptions/EditSubscriptionPage';
import CreateSubscriptionPage from '~/app/pages/subscriptions/CreateSubscriptionPage';
import AllApiKeysPage from '~/app/pages/api-keys/AllApiKeysPage';

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/tokens" element={<AllApiKeysPage />} />
    <Route path="/subscriptions" element={<AllSubscriptionsPage />} />
    <Route path="/subscriptions/create" element={<CreateSubscriptionPage />} />
    <Route path="/subscriptions/view/:subscriptionName" element={<ViewSubscriptionPage />} />
    <Route path="/subscriptions/edit/:subscriptionName" element={<EditSubscriptionPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
