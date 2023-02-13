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
  let title = odhApp.spec.displayName;
  let icon;

  if (isRedHatSupported(odhApp)) {
    const splitTitle = odhApp.spec.displayName.split(' ');
    title = `${splitTitle.slice(0, -1).join(' ')} `;
    icon = (
      <span style={{ whiteSpace: 'nowrap' }}>
        <span aria-hidden style={{ verticalAlign: 'text-bottom' }}>
          {splitTitle[splitTitle.length - 1]}
        </span>
        <Tooltip removeFindDomNode content={`${ODH_PRODUCT_NAME} certified and supported`}>
          <img
            style={{ marginLeft: 'var(--pf-global--spacer--xs)' }}
            src="../images/CheckStar.svg"
            alt={`${ODH_PRODUCT_NAME} certified and supported`}
          />
        </Tooltip>
      </span>
    );
  }

  return (
    <CardTitle>
      <span aria-labelledby={odhApp.spec.displayName} style={{ verticalAlign: 'text-bottom' }}>
        {title}
      </span>
      {icon}
      {showProvider && odhApp.spec.provider && (
        <div>
          <span className="odh-card__provider">by {odhApp.spec.provider}</span>
        </div>
      )}
    </CardTitle>
  );
};

export default SupportedAppTitle;
