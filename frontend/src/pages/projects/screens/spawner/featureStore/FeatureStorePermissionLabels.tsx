import * as React from 'react';
import { Label, LabelGroup } from '@patternfly/react-core';
import { FEATURE_STORE_PERMISSION_LABEL_THRESHOLD } from './selectFeatureStoresModalConst';

type FeatureStorePermissionLabelsProps = {
  permissions: string[];
};

export const FeatureStorePermissionLabels: React.FC<FeatureStorePermissionLabelsProps> = ({
  permissions,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const overflowCount = Math.max(permissions.length - FEATURE_STORE_PERMISSION_LABEL_THRESHOLD, 0);
  const displayedPermissions = isExpanded
    ? permissions
    : permissions.slice(0, FEATURE_STORE_PERMISSION_LABEL_THRESHOLD);

  return (
    <LabelGroup numLabels={permissions.length}>
      {displayedPermissions.map((permission) => (
        <Label key={permission} color="blue" variant="outline" isCompact>
          {permission}
        </Label>
      ))}
      {!isExpanded && overflowCount > 0 && (
        <Label
          data-testid="feature-store-permission-overflow"
          variant="overflow"
          isCompact
          onClick={() => setIsExpanded(true)}
        >
          {overflowCount} more
        </Label>
      )}
    </LabelGroup>
  );
};

export default FeatureStorePermissionLabels;
