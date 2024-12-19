import * as React from 'react';
import { ModelRegistrySelectorContextProvider } from '~/app/context/ModelRegistrySelectorContext';
declare const navItems: {
    label: string;
    href: string;
}[];
declare const adminNavItems: {
    label: string;
    href: string;
}[];
declare const routes: {
    path: string;
    element: React.JSX.Element;
}[];
declare const adminRoutes: {
    path: string;
    element: React.JSX.Element;
}[];
export { navItems, adminNavItems, routes, adminRoutes, ModelRegistrySelectorContextProvider };
