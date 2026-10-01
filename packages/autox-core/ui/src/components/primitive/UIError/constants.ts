import type { UIErrorMapping } from './types';

const uiErrorMapping: UIErrorMapping = {
  title: 'Something went wrong',
  description: 'An unexpected error occurred. Please try again later.',
};

export const UIErrorDefaults = {
  uiErrorMapping,

  labels: {
    modalPrimaryCTA: 'Retry',
    modalSecondaryCTA: 'Close',
    copyCTA: 'Copy',

    subtitleTransaction: 'Transaction',
    subtitleID: 'ID',
    subtitleDetails: 'Details',

    moreDetails: 'More details...',
  },
};
