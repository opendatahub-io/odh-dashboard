import { stopNotebook } from '#~/services/notebookService';
import { TypedPromiseRejectedResult } from '#~/types';
import { NotebookKind } from '#~/k8sTypes';
import { allSettledPromises } from '#~/utilities/allSettledPromises';

export const stopWorkbenches = (
  notebooksToStop: NotebookKind[],
  isAdmin: boolean,
): Promise<
  [
    PromiseFulfilledResult<NotebookKind | void>[],
    TypedPromiseRejectedResult<undefined>[],
    PromiseSettledResult<NotebookKind | void>[],
  ]
> =>
  allSettledPromises<NotebookKind | void>(
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
