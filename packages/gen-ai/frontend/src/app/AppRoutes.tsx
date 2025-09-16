import * as React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ChatbotMain } from '~/app/Chatbot/ChatbotMain';
import { AIAssetsPage } from '~/app/AIAssets/AIAssetsPage';
import { NotFound } from '~/app/NotFound/NotFound';
import { NavDataItem } from '~/app/standalone/types';

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

const routes: AppRouteConfig[] = [
  {
    element: <ChatbotMain />,
    exact: true,
    label: 'Chatbot',
    path: '/',
    title: 'Chatbot Main Page',
  },
  {
    element: <ChatbotMain />,
    exact: true,
    label: 'Chat Playground',
    path: '/chat-playground',
    title: 'Chat Playground Page',
  },
  {
    element: <AIAssetsPage />,
    exact: true,
    label: 'AI Assets',
    path: '/ai-assets',
    title: 'AI asset endpoints page',
  },
];

const flattenedRoutes: IAppRoute[] = routes.reduce<IAppRoute[]>(
  (flattened, route) => [...flattened, ...(route.routes ? route.routes : [route])],
  [],
);

export const useNavData = (): NavDataItem[] => [
  {
    label: 'Gen AI Studio',
    children: [
      {
        label: 'Chat Playground',
        path: '/chat-playground',
      },
      {
        label: 'AI Asset Endpoints',
        path: '/ai-assets',
      },
    ],
  },
];

const AppRoutes: React.FC = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/chat-playground" replace />} />
    {flattenedRoutes.map(({ path, element }, idx) => (
      <Route path={path} element={element} key={idx} />
    ))}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export { AppRoutes, routes };
