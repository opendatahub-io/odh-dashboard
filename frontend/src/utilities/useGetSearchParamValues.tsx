import { useSearchParams } from 'react-router-dom';

export function useGetSearchParamValues(params: string[]): Record<string, string> {
  const [searchParams] = useSearchParams();

  return params.reduce((acc: Record<string, string>, param) => {
    const searchParamValue = searchParams.get(param);

    if (searchParamValue) {
      acc[param] = searchParamValue;
    }

    return acc;
  }, {});
}
