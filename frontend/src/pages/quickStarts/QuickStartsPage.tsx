import * as React from 'react';
import { QuickStartCatalogPage } from '@cloudmosaic/quickstarts';
import QuickStarts from '../../app/QuickStarts';

const QuickStartsPage: React.FC = () => {
  return (
    <QuickStarts>
      <QuickStartCatalogPage showFilter />
    </QuickStarts>
  );
};

export default QuickStartsPage;
