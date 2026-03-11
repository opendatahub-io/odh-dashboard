import * as React from 'react';
import { useNavData } from '~/app/AppRoutes';
import NavSidebar from '~/app/standalone/NavSidebar';

const AppNavSidebar: React.FC = () => {
  const navData = useNavData();
  return <NavSidebar navData={navData} />;
};

export default AppNavSidebar;
