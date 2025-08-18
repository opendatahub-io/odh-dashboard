import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ChatbotMain } from '~/app/Chatbot/ChatbotMain';
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
];

const flattenedRoutes: IAppRoute[] = routes.reduce<IAppRoute[]>(
  (flattened, route) => [...flattened, ...(route.routes ? route.routes : [route])],
  [],
);

export const useNavData = (): NavDataItem[] => [
  {
    label: 'Gen AI V3',
    children: [
      {
        label: 'Chat playground',
        path: '/',
      },
    ],
  },
];

const AppRoutes = (): React.ReactElement => (
  <Routes>
    {flattenedRoutes.map(({ path, element }, idx) => (
      <Route path={path} element={element} key={idx} />
    ))}
    <Route element={<NotFound />} />
  </Routes>
);

export { AppRoutes, routes };
