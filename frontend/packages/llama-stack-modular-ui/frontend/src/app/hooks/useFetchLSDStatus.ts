/* eslint-disable no-relative-import-paths/no-relative-import-paths */
import * as React from 'react';
import { getLSDstatus } from '../services/llamaStackService';
import { LlamaStackDistributionModel } from '../types';

const useFetchLSDStatus = (): LlamaStackDistributionModel | null => {
  const [lsdStatus, setLsdStatus] = React.useState<LlamaStackDistributionModel | null>(null);

  React.useEffect(() => {
    const fetchLSDStatus = async () => {
      try {
        const status: LlamaStackDistributionModel = await getLSDstatus('default');
        setLsdStatus(status);
      } catch {
        // Silently handle errors - just return null
        setLsdStatus(null);
      }
    };

    fetchLSDStatus();
  }, []);

  return lsdStatus;
};

export default useFetchLSDStatus;
