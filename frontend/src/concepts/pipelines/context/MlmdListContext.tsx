import React from 'react';

interface MlmdOrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

interface MlmdListContextProps {
  filterQuery: string | undefined;
  pageToken: string | undefined;
  maxResultSize: number;
  orderBy: MlmdOrderBy | undefined;
  setFilterQuery: (filterQuery: string | undefined) => void;
  setPageToken: (pageToken: string | undefined) => void;
  setMaxResultSize: (maxResultSize: number) => void;
  setOrderBy: (orderBy: MlmdOrderBy | undefined) => void;
}

const MlmdListContext = React.createContext({} as MlmdListContextProps);

export const MlmdListContextProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [filterQuery, setFilterQuery] = React.useState<string>();
  const [pageToken, setPageToken] = React.useState<string>();
  const [maxResultSize, setMaxResultSize] = React.useState(10);
  const [orderBy, setOrderBy] = React.useState<MlmdOrderBy>();
  const value = React.useMemo(
    () => ({
      filterQuery,
      pageToken,
      maxResultSize,
      orderBy,
      setFilterQuery,
      setPageToken,
      setMaxResultSize,
      setOrderBy,
    }),
    [filterQuery, maxResultSize, orderBy, pageToken],
  );

  return <MlmdListContext.Provider value={value}>{children}</MlmdListContext.Provider>;
};

export const useMlmdListContext = (nextPageToken?: string): MlmdListContextProps => {
  // https://github.com/patternfly/patternfly-react/issues/10312
  // Force disabled state to pagination when there is no nextPageToken
  React.useEffect(() => {
    const paginationNextButtons = document.querySelectorAll('button[aria-label="Go to next page"]');

    if (paginationNextButtons.length > 0) {
      paginationNextButtons.forEach((button) => {
        if (!nextPageToken) {
          button.setAttribute('disabled', '');
        } else {
          button.removeAttribute('disabled');
        }
      });
    }
  }, [nextPageToken]);

  return React.useContext(MlmdListContext);
};
