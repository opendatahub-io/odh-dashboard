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
      <span style={{ display: 'flex' }}>
        {odhApp.spec.displayName}
        {isRedHatSupported(odhApp) && (
          <Tooltip removeFindDomNode content={`${ODH_PRODUCT_NAME} certified and supported`}>
            <img
              style={{ marginLeft: 'var(--pf-global--spacer--xs)' }}
              src="../images/CheckStar.svg"
              alt={`${ODH_PRODUCT_NAME} certified and supported`}
            />
          </Tooltip>
        )}
      </span>
      {showProvider && odhApp.spec.provider && (
        <div>
          <span className="odh-card__provider">by {odhApp.spec.provider}</span>
        </div>
      )}
    </CardTitle>
  );
};

export default SupportedAppTitle;
