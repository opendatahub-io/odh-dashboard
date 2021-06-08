import React from 'react';
import { QuickStartContext, QuickStartContextValues } from '@cloudmosaic/quickstarts';
import { makeCardVisible } from '../utilities/utils';

export const useQuickStartCardSelected = (
  quickStartName: string | null | undefined,
  cardId: string,
): [QuickStartContextValues, boolean] => {
  const qsContext = React.useContext<QuickStartContextValues>(QuickStartContext);

  const selected = React.useMemo(() => {
    return !!quickStartName && qsContext.activeQuickStartID === quickStartName;
  }, [quickStartName, qsContext.activeQuickStartID]);

  React.useEffect(() => {
    if (selected) {
      makeCardVisible(cardId);
    }
  }, [cardId, selected]);

  return [qsContext, selected];
};
