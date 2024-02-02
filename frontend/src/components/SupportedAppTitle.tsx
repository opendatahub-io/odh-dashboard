import React from 'react';
import { Button, CardTitle, Tooltip } from '@patternfly/react-core';
import { OdhApplication } from '~/types';
import { isRedHatSupported } from '~/utilities/utils';
import { ODH_PRODUCT_NAME } from '~/utilities/const';

type SupportedAppTitleProps = {
  odhApp: OdhApplication;
  showProvider?: boolean;
};

const SupportedAppTitle: React.FC<SupportedAppTitleProps> = ({ odhApp, showProvider = false }) => {
  const title = odhApp.spec.displayName;
  const icon = (
    <span style={{ whiteSpace: 'nowrap' }}>
      <Tooltip content={`${ODH_PRODUCT_NAME} certified and supported`}>
        <Button variant="plain" style={{ padding: 0, verticalAlign: 'middle' }}>
          <img
            style={{
              marginLeft: 'var(--pf-v5-global--spacer--xs)',
              marginRight: 'var(--pf-v5-global--spacer--md)',
            }}
            src="../images/CheckStar.svg"
            alt={`${ODH_PRODUCT_NAME} certified and supported`}
          />
        </Button>
      </Tooltip>
    </span>
  );

  return (
    <CardTitle>
      <span style={{ verticalAlign: 'text-bottom' }}>{title}</span>
      {isRedHatSupported(odhApp) && icon}
      {showProvider && odhApp.spec.provider && (
        <div>
          <span className="odh-card__provider">by {odhApp.spec.provider}</span>
        </div>
      )}
    </CardTitle>
  );
};

export default SupportedAppTitle;
