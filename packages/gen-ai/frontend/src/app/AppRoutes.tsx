import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ChatbotMain } from '~/app/Chatbot/ChatbotMain';
import { AIAssetsPage } from '~/app/AIAssets/AIAssetsPage';
import { NotFound } from '~/app/EmptyStates/NotFound';
import { NavDataItem } from '~/app/standalone/types';
import GenAiCoreLoader from './GenAiCoreLoader';
import ChatbotHeader from './Chatbot/ChatbotHeader';

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
        label: 'Chat playground',
        path: '/playground',
      },
      {
        label: 'AI asset endpoints',
        path: '/assets',
      },
    ],
  },
];

const AppRoutes = (): React.ReactElement => (
  <Routes>
    <Route
      path="/playground"
      element={
        <GenAiCoreLoader
          title={<ChatbotHeader />}
          getInvalidRedirectPath={(namespace) => `/chat-playground/${namespace}`}
        />
      }
    >
      <Route path=":namespace" element={<ChatbotMain />} />
    </Route>
    <Route path="/assets" element={<AIAssetsPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export { AppRoutes };
