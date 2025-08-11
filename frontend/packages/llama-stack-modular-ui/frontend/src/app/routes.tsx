import * as React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ChatbotMain } from './Chatbot/ChatbotMain';
import { NotFound } from './NotFound/NotFound';

export interface IAppRoute {
  label?: string; // Excluding the label will exclude the route from the nav sidebar in AppLayout
  /* eslint-disable @typescript-eslint/no-explicit-any */
  element: React.ReactElement;
  /* eslint-enable @typescript-eslint/no-explicit-any */
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

const AppRoutes = (): React.ReactElement => (
  <Routes>
    {flattenedRoutes.map(({ path, element }, idx) => (
      <Route path={path} element={element} key={idx} />
    ))}
    <Route element={<NotFound />} />
  </Routes>
);

export { AppRoutes, routes };
