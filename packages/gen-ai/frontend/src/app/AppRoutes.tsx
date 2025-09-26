import * as React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ChatbotPage from '~/app/Chatbot/ChatbotPage';
import { AIAssetsPage } from '~/app/AIAssets/AIAssetsPage';
import { NotFound } from '~/app/EmptyStates/NotFound';
import { NavDataItem } from '~/app/standalone/types';
import GenAiCoreLoader from '~/app/GenAiCoreLoader';
import {
  chatPlaygroundRootPath,
  genAiAiAssetsRoute,
  genAiChatPlaygroundRoute,
} from '~/app/utilities/routes';

import '@patternfly/chatbot/dist/css/main.css';

export interface IAppRoute {
  label?: string; // Excluding the label will exclude the route from the nav sidebar in AppLayout
  element: React.ReactElement;
  exact?: boolean;
  path: string;
  title: string;
  routes?: undefined;
}

export interface IAppRouteGroup {
  label: string;
  routes: IAppRoute[];
}

export type AppRouteConfig = IAppRoute | IAppRouteGroup;

export const useNavData = (): NavDataItem[] => [
  {
    label: 'Gen AI V3',
    children: [
      {
        label: 'Playground',
        path: '/gen-ai/playground/*',
        href: '/gen-ai/playground',
      },
      {
        label: 'AI asset endpoints',
        path: '/gen-ai/assets/*',
        href: '/gen-ai/assets',
      },
    ],
  },
];

const AppRoutes = (): React.ReactElement => (
  <Routes>
    <Route path="/" element={<Navigate to={chatPlaygroundRootPath} replace />} />
    <Route
      path="/playground"
      element={
        <GenAiCoreLoader title="Playground" getInvalidRedirectPath={genAiChatPlaygroundRoute} />
      }
    >
      <Route path=":namespace" element={<ChatbotPage />} />
    </Route>
    <Route
      path="/assets"
      element={
        <GenAiCoreLoader title="AI asset endpoints" getInvalidRedirectPath={genAiAiAssetsRoute} />
      }
    >
      <Route path=":namespace" element={<AIAssetsPage />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export { AppRoutes };
