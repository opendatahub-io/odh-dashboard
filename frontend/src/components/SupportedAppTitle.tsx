import React from 'react';
import { CardTitle, Tooltip } from '@patternfly/react-core';
import { OdhApplication } from '../types';
import { isRedHatSupported } from '../utilities/utils';
import { ODH_PRODUCT_NAME } from 'utilities/const';

type SupportedAppTitleProps = {
  odhApp: OdhApplication;
  showProvider?: boolean;
};

const SupportedAppTitle: React.FC<SupportedAppTitleProps> = ({ odhApp, showProvider = false }) => {
  return (
    <CardTitle>
      <span style={{ verticalAlign: 'text-bottom' }}>{odhApp.spec.displayName}</span>
      {isRedHatSupported(odhApp) && (
        <Tooltip content={`${ODH_PRODUCT_NAME} certified and supported`}>
          <img
            style={{ marginLeft: 'var(--pf-global--spacer--xs)' }}
            src="../images/CheckStar.svg"
            alt={`${ODH_PRODUCT_NAME} certified and supported`}
          />
        </Tooltip>
      )}
      {showProvider && odhApp.spec.provider && (
        <div>
          <span className="odh-card__provider">by {odhApp.spec.provider}</span>
        </div>
      )}
    </CardTitle>
  );
};

export default SupportedAppTitle;
