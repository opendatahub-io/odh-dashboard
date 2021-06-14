import React from 'react';
import { Label, Tooltip } from '@patternfly/react-core';
import { SyncAltIcon, CheckCircleIcon } from '@patternfly/react-icons';
import { QuickStartContext, QuickStartContextValues } from '@cloudmosaic/quickstarts';
import { OdhDocument, OdhDocumentType } from '../types';
import { isQuickStartComplete, isQuickStartInProgress } from '../utilities/quickStartUtils';
import { DOC_TYPE_TOOLTIPS } from '../utilities/const';
import { getLabelColorForDocType, getDuration } from '../utilities/utils';
import { DOC_TYPE_LABEL } from '../pages/learningCenter/const';

import './OdhCard.scss';

type DocCardBadgesProps = {
  odhDoc: OdhDocument;
};

const DocCardBadges: React.FC<DocCardBadgesProps> = ({ odhDoc }) => {
  const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);
  const [inProgress, setInProgress] = React.useState<boolean>(false);
  const [complete, setComplete] = React.useState<boolean>(false);
  const docType = odhDoc?.metadata.type as OdhDocumentType;
  const docName = odhDoc?.metadata.name;
  const duration = odhDoc?.spec.durationMinutes;

  React.useEffect(() => {
    if (docType === OdhDocumentType.QuickStart && qsContext.allQuickStarts) {
      const quickStart = qsContext.allQuickStarts.find((qs) => qs.metadata.name === docName);
      if (quickStart) {
        setInProgress(isQuickStartInProgress(quickStart.metadata.name, qsContext));
        setComplete(isQuickStartComplete(quickStart.metadata.name, qsContext));
      }
    }
  }, [qsContext, docType, docName]);

  const label = DOC_TYPE_LABEL[docType] || 'Documentation';

  return (
    <div className="odh-card__doc-badges">
      <Tooltip content={DOC_TYPE_TOOLTIPS[docType]}>
        <Label color={getLabelColorForDocType(docType)}>{label}</Label>
      </Tooltip>
      {duration ? (
        <Label variant="outline" color="grey">
          {getDuration(duration)}
        </Label>
      ) : null}
      {inProgress ? (
        <Label variant="outline" color="purple" icon={<SyncAltIcon />}>
          In Progress
        </Label>
      ) : null}
      {complete ? (
        <Label variant="outline" color="green" icon={<CheckCircleIcon />}>
          Complete
        </Label>
      ) : null}
    </div>
  );
};

export default DocCardBadges;
