import React from 'react';
import { ModuleHeader } from '@odh-dashboard/autox-core/ui/components/primitive';
import AutoragIcon from '~/app/images/icons/AutoragIcon';

const AutoragHeader: React.FC = () => (
  <ModuleHeader icon={<AutoragIcon />} label="AutoRAG" testIdPrefix="autorag-header" />
);

export default AutoragHeader;
