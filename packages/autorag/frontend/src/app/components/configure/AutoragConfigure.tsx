import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  Label,
  Panel,
  PanelMain,
  PanelMainBody,
  PanelFooter,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import React, { useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { useWatchConnectionTypes } from '@odh-dashboard/internal/utilities/useWatchConnectionTypes';
import { Connection } from '@odh-dashboard/internal/concepts/connectionTypes/types';
import {
  isConnectionType,
  isConnectionTypeDataField,
  S3ConnectionTypeKeys,
} from '@odh-dashboard/internal/concepts/connectionTypes/utils';
import { autoragConfigurePathname, autoragResultsPathname } from '~/app/utilities/routes';
import { getMissingRequiredKeys } from '~/app/utilities/secretValidation';
import { SecretListItem } from '~/app/types';
import FileExplorer from '~/app/components/common/FileExplorer/FileExplorer.tsx';
import SecretSelector from '~/app/shared/SecretSelector';
import { AutoragConnectionModal } from '~/app/components/configure/AutoragConnectionModal';

const AUTORAG_REQUIRED_KEYS: { [type: string]: string[] } = { s3: ['aws_s3_bucket'] };

function AutoragConfigure(): React.JSX.Element {
  const navigate = useNavigate();
  const { namespace } = useParams();
  const [allConnectionTypes] = useWatchConnectionTypes();
  const autoragConnectionTypes = React.useMemo(
    () =>
      allConnectionTypes.filter((ct) => {
        if (!isConnectionType(ct)) {
          return false;
        }
        const fieldEnvs = ct.data?.fields?.map((f) => isConnectionTypeDataField(f) && f.envVar);
        return S3ConnectionTypeKeys.every((envVar) => fieldEnvs?.includes(envVar));
      }),
    [allConnectionTypes],
  );
  const [isConnectionModalOpen, setIsConnectionModalOpen] = React.useState(false);
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState<boolean>(false);
  const [selectedSecret, setSelectedSecret] = useState<
    { uuid: string; name: string; invalid?: boolean } | undefined
  >();
  const secretsRefreshRef = useRef<(() => Promise<SecretListItem[] | undefined>) | null>(null);

  if (!namespace) {
    return <Navigate to={autoragConfigurePathname} replace />;
  }

  const formInvalid = !selectedSecret || selectedSecret.invalid === true;

  return (
    <>
      <Panel isScrollable={false}>
        <PanelMain tabIndex={0}>
          <PanelMainBody>
            <Grid hasGutter>
              <GridItem span={4}>
                <Card className="pf-v6-u-h-100">
                  <CardTitle>Documents</CardTitle>
                  <CardBody>
                    <Stack>
                      <StackItem className="pf-v6-u-font-size-sm pf-v6-u-mb-sm">
                        Select or add an S3 connection to upload files or browse existing files.
                      </StackItem>
                      <StackItem>
                        <Split
                          style={{
                            display: 'flex',
                            alignItems: 'flex-end',
                          }}
                        >
                          <SplitItem isFilled data-temp-placeholder style={{ marginRight: '1rem' }}>
                            <SecretSelector
                              namespace={String(namespace)}
                              type="storage"
                              additionalRequiredKeys={AUTORAG_REQUIRED_KEYS}
                              value={selectedSecret?.uuid}
                              onChange={(secret) => setSelectedSecret(secret)}
                              onRefreshReady={(refresh) => {
                                secretsRefreshRef.current = refresh;
                              }}
                              label="S3 connection"
                              placeholder="Select connection"
                              toggleWidth="16rem"
                              dataTestId="aws-secret-selector"
                            />
                          </SplitItem>
                          <SplitItem>
                            <Button
                              key="add-new-connection"
                              variant="secondary"
                              onClick={() => setIsConnectionModalOpen(true)}
                            >
                              Add new connection
                            </Button>
                          </SplitItem>
                        </Split>
                      </StackItem>
                      {Boolean(selectedSecret?.uuid) && (
                        <>
                          <StackItem className="pf-v6-u-font-size-md pf-v6-u-mb-sm pf-v6-u-mt-md">
                            Selected connection
                          </StackItem>
                          <StackItem>
                            <Label
                              onClose={() => setSelectedSecret(undefined)}
                              closeBtnAriaLabel="Clear selected connection"
                            >
                              {selectedSecret?.name}
                            </Label>
                          </StackItem>

                          <StackItem className="pf-v6-u-font-size-md pf-v6-u-mb-sm pf-v6-u-mt-md">
                            Selected files
                          </StackItem>
                          <StackItem>
                            <Button
                              key="select-files"
                              variant="secondary"
                              onClick={() => setIsFileExplorerOpen(true)}
                              isDisabled={formInvalid}
                            >
                              Select files
                            </Button>
                          </StackItem>
                        </>
                      )}
                    </Stack>
                  </CardBody>
                </Card>
              </GridItem>
              <GridItem span={8}>
                <Card className="pf-v6-u-h-100">
                  <CardTitle>Configure details</CardTitle>
                  <CardBody>
                    <Stack>
                      <StackItem className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm pf-v6-u-mb-sm">
                        Where would you like to index your documents?
                      </StackItem>
                      <StackItem data-temp-placeholder>Vector index dropdown</StackItem>

                      <StackItem className="pf-v6-u-font-weight-bold pf-v6-u-font-size-sm pf-v6-u-mb-sm pf-v6-u-mt-md">
                        Add the data source you would like to use for evaluation.{' '}
                        <span className="pf-v6-u-text-color-required">*</span>
                      </StackItem>
                      <StackItem data-temp-placeholder>
                        Evaluation data source upload component
                      </StackItem>

                      <Grid hasGutter className="pf-v6-u-mt-md">
                        <GridItem span={6}>
                          <Card>
                            <CardHeader
                              hasWrap
                              actions={{
                                actions: [
                                  <Button
                                    key="edit-optimization-metric"
                                    variant="secondary"
                                    onClick={() => null}
                                    isDisabled={formInvalid}
                                  >
                                    Edit
                                  </Button>,
                                ],
                              }}
                            >
                              <CardTitle>Optimization metric</CardTitle>
                            </CardHeader>
                            <CardBody />
                          </Card>
                        </GridItem>
                        <GridItem span={6}>
                          <Card>
                            <CardHeader
                              hasWrap
                              actions={{
                                actions: [
                                  <Button
                                    key="edit-considered-models"
                                    variant="secondary"
                                    onClick={() => null}
                                    isDisabled={formInvalid}
                                  >
                                    Edit
                                  </Button>,
                                ],
                              }}
                            >
                              <CardTitle>Models to consider</CardTitle>
                            </CardHeader>
                            <CardBody />
                          </Card>
                        </GridItem>
                      </Grid>
                    </Stack>
                  </CardBody>
                </Card>
              </GridItem>
            </Grid>
          </PanelMainBody>
        </PanelMain>
        <PanelFooter>
          <Button
            variant="primary"
            isDisabled={formInvalid}
            onClick={() => {
              navigate(`${autoragResultsPathname}/FAKE_RUN_ID`);
            }}
          >
            Run experiment
          </Button>
        </PanelFooter>
      </Panel>

      {isConnectionModalOpen && (
        <AutoragConnectionModal
          connectionTypes={autoragConnectionTypes}
          project={namespace}
          onClose={() => {
            setIsConnectionModalOpen(false);
          }}
          onSubmit={async (connection: Connection) => {
            const refresh = secretsRefreshRef.current;
            if (!refresh) {
              return;
            }
            const list = await refresh();
            const secret = list?.find((s) => s.name === connection.metadata.name);
            if (secret) {
              const requiredKeys = AUTORAG_REQUIRED_KEYS[secret.type] ?? [];
              const availableKeys = Object.keys(connection.stringData ?? {});
              const invalid = getMissingRequiredKeys(requiredKeys, availableKeys).length > 0;
              setSelectedSecret({
                uuid: secret.uuid,
                name: secret.name,
                invalid,
              });
            }
          }}
        />
      )}
      <FileExplorer
        id="AutoRagConfigure-FileExplorer"
        isOpen={isFileExplorerOpen}
        onClose={() => setIsFileExplorerOpen(false)}
        onSelect={(files) => null /* eslint-disable-line @typescript-eslint/no-unused-vars */}
      />
    </>
  );
}

export default AutoragConfigure;
