import { stopNotebook } from '#~/services/notebookService';
import { Notebook, TypedPromiseRejectedResult } from '#~/types';
import { allSettledPromises } from '#~/utilities/allSettledPromises';

export const stopWorkbenches = (
  notebooksToStop: Notebook[],
  isAdmin: boolean,
): Promise<
  [
    PromiseFulfilledResult<Notebook | void>[],
    TypedPromiseRejectedResult<undefined>[],
    PromiseSettledResult<Notebook | void>[],
  ]
> =>
  allSettledPromises<Notebook | void>(
    notebooksToStop.map((notebook) => {
      const notebookName = notebook.metadata.name || '';
      if (!notebookName) {
        return Promise.resolve();
      }

      if (!isAdmin) {
        return stopNotebook();
      }

      const notebookUser = notebook.metadata.annotations?.['opendatahub.io/username'];
      if (!notebookUser) {
        return Promise.resolve();
      }

      return stopNotebook(notebookUser);
    }),
  );
