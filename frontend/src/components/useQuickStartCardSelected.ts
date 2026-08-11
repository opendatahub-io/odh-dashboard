import React from 'react';
import {
  QuickStartsContext,
  type QuickStartContextValues,
} from '#~/concepts/quickStarts/QuickStartsContext';
import { makeCardVisible } from '#~/utilities/utils';

export const useQuickStartCardSelected = (
  quickStartName: string | null | undefined,
  cardId: string,
): [QuickStartContextValues, boolean] => {
  const qsContext = React.useContext<QuickStartContextValues>(QuickStartsContext);

  const selected = React.useMemo(
    () => !!quickStartName && qsContext.activeQuickStartID === quickStartName,
    [quickStartName, qsContext.activeQuickStartID],
  );

  React.useEffect(() => {
    if (selected) {
      makeCardVisible(cardId);
    }
  }, [cardId, selected]);

  return [qsContext, selected];
};
