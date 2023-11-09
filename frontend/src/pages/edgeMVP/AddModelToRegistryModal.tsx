import { Button, Checkbox, Form, FormGroup, FormSelect, FormSelectOption, Modal, ModalVariant, Radio, Stack, StackItem, TextInput } from '@patternfly/react-core';
import * as React from 'react';

type AddModelToRegistryModalProps = {
    isOpen: boolean;
    onClose: (submit: boolean) => void;
}

const AddModelToRegistryModal: React.FC<AddModelToRegistryModalProps> = ({ isOpen, onClose }) => {
    const [isDefault, setIsDefault] = React.useState<boolean>(true);
    const [modelName, setModelName] = React.useState<string>('');
    const [modelFramework, setModelFramework] = React.useState<string>('PyTorch');
    const [s3BucketData, setS3BucketData] = React.useState({
        accessKey: '',
        secretKey: '',
        endpoint: '',
        region: '',
        bucket: '',
        path: ''
    });
    const [gitRepoData, setGitRepoData] = React.useState({
        apiToken: '',
        url: '',
        branch: '',
        modelDirectory: ''
    });

    const options = [
        { value: 'PyTorch', label: 'PyTorch', disabled: false, isPlaceholder: false },
        { value: 'TensorFlow', label: 'TensorFlow', disabled: false, isPlaceholder: false },
        { value: 'OpenVino', label: 'OpenVino', disabled: false, isPlaceholder: false },
    ];

    const onChange = (value: string, _event: React.FormEvent<HTMLSelectElement>) => {
        setModelFramework(value);
    };

    return (
        <Modal
            bodyAriaLabel="Scrollable modal content"
            tabIndex={0}
            variant={ModalVariant.small}
            title="Add model"
            isOpen={isOpen}
            onClose={() => onClose(false)}
            actions={[
                <Button key="confirm" variant="primary" onClick={() => { }}>
                    Add model
                </Button>,
                <Button key="cancel" variant="link" onClick={() => { }}>
                    Cancel
                </Button>
            ]}
        >
            <Form>
                <Stack hasGutter>
                    <StackItem>
                        <FormGroup label="Model Name" fieldId="add-model-name-input" isRequired>
                            <TextInput
                                isRequired
                                id="inference-service-name-input"
                                value={modelName}
                                onChange={(name) => setModelName(name)}
                            />
                        </FormGroup>
                    </StackItem>
                    <StackItem>
                        <FormGroup label="Model framework" fieldId="add-model-framework-input" isRequired>
                            <FormSelect
                                id="model-framework-selection"
                                value={modelFramework}
                                onChange={onChange}
                                aria-label="Model framework selection"
                            >
                                {options.map((option, index) => (
                                    <FormSelectOption
                                        isDisabled={option.disabled}
                                        key={index}
                                        value={option.value}
                                        label={option.label}
                                        isPlaceholder={option.isPlaceholder}
                                    />
                                ))}
                            </FormSelect>
                        </FormGroup>
                    </StackItem>
                    <FormGroup role="group" isInline fieldId="model-location" label="Model location">
                        <StackItem>
                            <Radio
                                label="S3 bucket"
                                isChecked={isDefault}
                                onChange={() => {
                                    setIsDefault(true)
                                }}
                                id="model-registry-s3-bucket-radio"
                                name="s3-bucket-radio"
                                body={
                                    <Stack hasGutter>
                                        <StackItem>
                                            <FormGroup label="Access key" fieldId="s3-access-key-input" isRequired>
                                                <TextInput
                                                    isRequired
                                                    id="s3-access-key-input"
                                                    name="s3-access-key-input"
                                                    aria-describedby="s3-access-key-input"
                                                    value={s3BucketData.accessKey}
                                                    onChange={(accessKey) => setS3BucketData({ ...s3BucketData, accessKey })}
                                                    isDisabled={!isDefault}
                                                    style={{ width: '400px' }}
                                                />
                                            </FormGroup>
                                        </StackItem>
                                        <StackItem>
                                            <FormGroup label="Secret key" fieldId="s3-secret-key-input" isRequired>
                                                <TextInput
                                                    isRequired
                                                    id="s3-secret-key-input"
                                                    name="s3-secret-key-input"
                                                    aria-describedby="s3-secret-key-input"
                                                    value={s3BucketData.secretKey}
                                                    onChange={(secretKey) => setS3BucketData({ ...s3BucketData, secretKey })}
                                                    isDisabled={!isDefault}
                                                    style={{ width: '400px' }}
                                                />
                                            </FormGroup>
                                        </StackItem>
                                        <StackItem>
                                            <FormGroup label="Endpoint" fieldId="s3-endpoint-name-input" isRequired>
                                                <TextInput
                                                    isRequired
                                                    id="s3-endpoint-name-input"
                                                    name="s3-endpoint-name-input"
                                                    aria-describedby="s3-endpoint-name-input"
                                                    value={s3BucketData.endpoint}
                                                    onChange={(endpoint) => setS3BucketData({ ...s3BucketData, endpoint })}
                                                    isDisabled={!isDefault}
                                                    style={{ width: '400px' }}
                                                />
                                            </FormGroup>
                                        </StackItem>
                                        <StackItem>
                                            <FormGroup label="Region" fieldId="s3-region-input">
                                                <TextInput
                                                    isRequired
                                                    id="s3-region-input"
                                                    name="s3-region-input"
                                                    aria-describedby="s3-region-input"
                                                    value={s3BucketData.region}
                                                    onChange={(region) => setS3BucketData({ ...s3BucketData, region })}
                                                    isDisabled={!isDefault}
                                                    style={{ width: '400px' }}
                                                />
                                            </FormGroup>
                                        </StackItem>
                                        <StackItem>
                                            <FormGroup label="Bucket" fieldId="s3-bucket-name-input">
                                                <TextInput
                                                    isRequired
                                                    id="s3-bucket-name-input"
                                                    name="s3-bucket-name-input"
                                                    aria-describedby="s3-bucket-name-input"
                                                    value={s3BucketData.bucket}
                                                    onChange={(bucket) => setS3BucketData({ ...s3BucketData, bucket })}
                                                    isDisabled={!isDefault}
                                                    style={{ width: '400px' }}
                                                />
                                            </FormGroup>
                                        </StackItem>
                                        <StackItem>
                                            <FormGroup label="Path" fieldId="s3-bucket-path-input" isRequired>
                                                <TextInput
                                                    isRequired
                                                    id="s3-bucket-path-input"
                                                    name="s3-bucket-path-input"
                                                    aria-describedby="s3-bucket-path-input"
                                                    value={s3BucketData.path}
                                                    onChange={(path) => setS3BucketData({ ...s3BucketData, path })}
                                                    isDisabled={!isDefault}
                                                    style={{ width: '400px' }}
                                                />
                                            </FormGroup>
                                        </StackItem>
                                    </Stack>
                                }
                            />
                        </StackItem>
                        <StackItem>
                            <Radio
                                label="Git repository"
                                isChecked={!isDefault}
                                onChange={() => {
                                    setIsDefault(false)
                                }}
                                id="model-registry-git-respository-radio"
                                name="git-repository-radio"
                                body={
                                    <Stack hasGutter>
                                        <StackItem>
                                            <FormGroup label="API Token" fieldId="github-api-token-input" isRequired>
                                                <TextInput
                                                    isRequired
                                                    id="github-api-token-input"
                                                    name="github-api-token-input"
                                                    aria-describedby="github-api-token-input"
                                                    value={gitRepoData.apiToken}
                                                    onChange={(apiToken) => setGitRepoData({ ...gitRepoData, apiToken })}
                                                    isDisabled={isDefault}
                                                    style={{ width: '400px' }}
                                                />
                                            </FormGroup>
                                        </StackItem>
                                        <StackItem>
                                            <FormGroup label="URL" fieldId="github-url-input" isRequired>
                                                <TextInput
                                                    isRequired
                                                    id="github-url-input"
                                                    name="github-url-input"
                                                    aria-describedby="github-url-input"
                                                    value={gitRepoData.url}
                                                    onChange={(url) => setGitRepoData({ ...gitRepoData, url })}
                                                    isDisabled={isDefault}
                                                    style={{ width: '400px' }}
                                                />
                                            </FormGroup>
                                        </StackItem>
                                        <StackItem>
                                            <FormGroup label="Branch" fieldId="github-branch-name-input" isRequired>
                                                <TextInput
                                                    isRequired
                                                    id="github-branch-name-input"
                                                    name="github-branch-name-input"
                                                    aria-describedby="github-branch-name-input"
                                                    value={gitRepoData.branch}
                                                    onChange={(branch) => setGitRepoData({ ...gitRepoData, branch })}
                                                    isDisabled={isDefault}
                                                    style={{ width: '400px' }}
                                                />
                                            </FormGroup>
                                        </StackItem>
                                        <StackItem>
                                            <FormGroup label="Model directory" fieldId="github-model-directory-input" isRequired>
                                                <TextInput
                                                    isRequired
                                                    id="github-model-directory-input"
                                                    name="github-model-directory-input"
                                                    aria-describedby="github-model-directory-input"
                                                    value={gitRepoData.modelDirectory}
                                                    onChange={(modelDirectory) => setGitRepoData({ ...gitRepoData, modelDirectory })}
                                                    isDisabled={isDefault}
                                                    style={{ width: '400px' }}
                                                />
                                            </FormGroup>
                                        </StackItem>
                                    </Stack>
                                }
                            />
                        </StackItem>
                    </FormGroup>
                </Stack>
            </Form>
        </Modal>
    )
}

export default AddModelToRegistryModal;