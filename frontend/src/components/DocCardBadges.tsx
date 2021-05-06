import React from 'react';
import * as classNames from 'classnames';
import { Tooltip } from '@patternfly/react-core';
import { SyncAltIcon, CheckCircleIcon } from '@patternfly/react-icons';
import { QuickStartContext, QuickStartContextValues } from '@cloudmosaic/quickstarts';
import { ODHDoc, ODHDocType } from '@common/types';
import { isQuickStartComplete, isQuickStartInProgress } from '../utilities/quickStartUtils';
import { getTextForDocType } from '../pages/learningCenter/learningCenterUtils';

import './OdhCard.scss';

const DOC_TYPE_TOOLTIPS = {
  [ODHDocType.Documentation]: 'Technical information for using the service',
  [ODHDocType.Tutorial]: 'End-to-end guides for solving business problems in data science',
  [ODHDocType.QuickStart]: 'Step-by-step instructions and tasks',
  [ODHDocType.HowTo]: 'Instructions and code for everyday procedures',
};

type DocCardBadgesProps = {
  odhDoc: ODHDoc;
};

const DocCardBadges: React.FC<DocCardBadgesProps> = ({ odhDoc }) => {
  const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);
  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [complete, setComplete] = React.useState<boolean>(false);
  const docType = odhDoc?.metadata.type as ODHDocType;
  const docName = odhDoc?.metadata.name;
  const duration = odhDoc?.spec.durationMinutes;

  React.useEffect(() => {
    if (docType === ODHDocType.QuickStart && qsContext.allQuickStarts) {
      const quickStart = qsContext.allQuickStarts.find((qs) => qs.metadata.name === docName);
      if (quickStart) {
        setInProgress(isQuickStartInProgress(quickStart.metadata.name, qsContext));
        setComplete(isQuickStartComplete(quickStart.metadata.name, qsContext));
      }
    }
  }, [qsContext, docType, docName]);

  const label = getTextForDocType(docType);
  const typeBadgeClasses = classNames('odh-card__partner-badge odh-m-doc', {
    'odh-m-documentation': docType === ODHDocType.Documentation,
    'odh-m-tutorial': docType === ODHDocType.Tutorial,
    'odh-m-quick-start': docType === ODHDocType.QuickStart,
    'odh-m-how-to': docType === ODHDocType.HowTo,
  });
  const durationBadgeClasses = classNames('odh-card__partner-badge odh-m-doc odh-m-duration', {
    'm-hidden': docType === ODHDocType.Documentation || duration === undefined,
  });
  const progressBadgeClasses = classNames('odh-card__partner-badge odh-m-doc', {
    'm-hidden': !complete && !inProgress,
    'odh-m-in-progress': inProgress,
    'odh-m-complete': complete,
  });

  return (
    <div className="odh-card__doc-badges">
      <Tooltip content={DOC_TYPE_TOOLTIPS[docType]}>
        <div className={typeBadgeClasses}>{label}</div>
      </Tooltip>
      <div className={durationBadgeClasses}>{duration} minutes</div>
      <div className={progressBadgeClasses}>
        {inProgress ? <SyncAltIcon /> : <CheckCircleIcon />}
        {inProgress ? 'In progress' : 'Complete'}
      </div>
    </div>
  );
};

export default DocCardBadges;
