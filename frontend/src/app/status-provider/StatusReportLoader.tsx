import React from 'react';
import {
  isStatusProviderExtension,
  StatusReport,
} from '@odh-dashboard/plugin-core/extension-points';
import { HookNotify, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { getStatusReportSummary } from './utils';

type Props = {
  statusProviderId: string;
  onLoad: (value: StatusReport[], summary: StatusReport | undefined) => void;
};

export const StatusReportLoader: React.FC<Props> = ({ statusProviderId, onLoad }) => {
  const [extensions] = useResolvedExtensions(isStatusProviderExtension);
  const [reports, setReports] = React.useState<{ [key: string]: StatusReport | undefined }>({});

  const statusProviders = React.useMemo(
    () => extensions.filter((e) => e.properties.id === statusProviderId),
    [extensions, statusProviderId],
  );

  React.useEffect(() => {
    const allReports = Object.values(reports).filter((report) => !!report);
    onLoad(allReports, getStatusReportSummary(allReports));
    // only run when reports change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports]);

  if (!statusProviders.length) {
    return null;
  }

  return (
    <>
      {statusProviders.map((provider) => (
        <HookNotify
          key={provider.uid}
          onNotify={(value) =>
            setReports((prevReports) => ({
              ...prevReports,
              [provider.uid]: value,
            }))
          }
          onUnmount={() =>
            setReports((prevReports) => {
              const newReports = { ...prevReports };
              delete newReports[provider.uid];
              return newReports;
            })
          }
          useHook={provider.properties.statusProviderHook}
        />
      ))}
    </>
  );
};
