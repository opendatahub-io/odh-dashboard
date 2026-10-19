import React from 'react';
import { ModuleHeader } from '@odh-dashboard/autox-core/ui/components/primitive';
import AutomlIcon from '~/app/images/icons/AutomlIcon';

const AutomlHeader: React.FC = () => (
  <ModuleHeader icon={<AutomlIcon />} label="AutoML" testIdPrefix="automl-header" />
);

export default AutomlHeader;
