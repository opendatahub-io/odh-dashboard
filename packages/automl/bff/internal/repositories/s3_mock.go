package repositories

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"strings"

	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
)

// mockCSVContent is the shared CSV fixture used by both GetS3Object and GetS3CSVSchema
// It matches the 5-column schema: id (integer), name (string), score (double), is_active (bool), created_at (timestamp)
// Contains 100+ data rows to match production GetS3CSVSchema validation (minimum 100 rows required)
const mockCSVContent = `id,name,score,is_active,created_at
1,Alice,95.5,true,2024-01-15T10:30:00Z
2,Bob,87.3,false,2024-01-16T14:45:00Z
3,Charlie,92.1,true,2024-01-17T08:15:00Z
4,Diana,78.9,false,2024-01-18T11:20:00Z
5,Edward,88.4,true,2024-01-19T09:45:00Z
6,Fiona,91.2,true,2024-01-20T14:30:00Z
7,George,83.7,false,2024-01-21T16:00:00Z
8,Hannah,96.8,true,2024-01-22T10:15:00Z
9,Ian,79.5,false,2024-01-23T13:40:00Z
10,Julia,90.3,true,2024-01-24T08:50:00Z
11,Kevin,85.6,true,2024-01-25T12:25:00Z
12,Laura,93.4,false,2024-01-26T15:10:00Z
13,Michael,81.2,true,2024-01-27T09:35:00Z
14,Nina,89.7,true,2024-01-28T11:55:00Z
15,Oscar,76.8,false,2024-01-29T14:20:00Z
16,Paula,94.5,true,2024-01-30T10:40:00Z
17,Quentin,87.9,false,2024-01-31T13:15:00Z
18,Rachel,91.8,true,2024-02-01T08:30:00Z
19,Samuel,84.3,true,2024-02-02T12:05:00Z
20,Tina,88.6,false,2024-02-03T15:45:00Z
21,Ulysses,92.7,true,2024-02-04T09:20:00Z
22,Vera,86.1,true,2024-02-05T11:35:00Z
23,Walter,79.4,false,2024-02-06T14:50:00Z
24,Xena,95.3,true,2024-02-07T10:25:00Z
25,Yves,83.8,false,2024-02-08T13:00:00Z
26,Zara,90.9,true,2024-02-09T08:40:00Z
27,Adam,85.2,true,2024-02-10T12:15:00Z
28,Beth,93.6,false,2024-02-11T15:30:00Z
29,Carl,81.7,true,2024-02-12T09:55:00Z
30,Dana,89.1,true,2024-02-13T11:10:00Z
31,Evan,77.9,false,2024-02-14T14:25:00Z
32,Faith,94.2,true,2024-02-15T10:50:00Z
33,Greg,87.5,false,2024-02-16T13:20:00Z
34,Holly,91.4,true,2024-02-17T08:35:00Z
35,Ivan,84.8,true,2024-02-18T12:00:00Z
36,Jane,88.3,false,2024-02-19T15:15:00Z
37,Kyle,92.6,true,2024-02-20T09:40:00Z
38,Lisa,86.9,true,2024-02-21T11:25:00Z
39,Mark,80.1,false,2024-02-22T14:40:00Z
40,Nancy,95.7,true,2024-02-23T10:05:00Z
41,Owen,83.4,false,2024-02-24T13:30:00Z
42,Pam,90.8,true,2024-02-25T08:55:00Z
43,Quinn,85.7,true,2024-02-26T12:20:00Z
44,Rose,93.1,false,2024-02-27T15:05:00Z
45,Steve,82.3,true,2024-02-28T09:30:00Z
46,Tara,89.6,true,2024-03-01T11:45:00Z
47,Uma,78.2,false,2024-03-02T14:10:00Z
48,Vince,94.9,true,2024-03-03T10:35:00Z
49,Wendy,87.1,false,2024-03-04T13:50:00Z
50,Xavier,91.5,true,2024-03-05T08:15:00Z
51,Yvonne,84.6,true,2024-03-06T12:40:00Z
52,Zack,88.9,false,2024-03-07T15:25:00Z
53,Amy,92.3,true,2024-03-08T09:50:00Z
54,Brian,86.4,true,2024-03-09T11:05:00Z
55,Cathy,79.8,false,2024-03-10T14:30:00Z
56,David,95.1,true,2024-03-11T10:55:00Z
57,Emma,83.2,false,2024-03-12T13:10:00Z
58,Frank,90.6,true,2024-03-13T08:25:00Z
59,Grace,85.9,true,2024-03-14T12:50:00Z
60,Henry,93.8,false,2024-03-15T15:35:00Z
61,Iris,81.5,true,2024-03-16T09:00:00Z
62,Jack,89.2,true,2024-03-17T11:15:00Z
63,Kelly,77.6,false,2024-03-18T14:40:00Z
64,Liam,94.4,true,2024-03-19T10:00:00Z
65,Mia,87.8,false,2024-03-20T13:25:00Z
66,Noah,91.9,true,2024-03-21T08:50:00Z
67,Olivia,84.1,true,2024-03-22T12:10:00Z
68,Paul,88.7,false,2024-03-23T15:00:00Z
69,Rita,92.5,true,2024-03-24T09:25:00Z
70,Sean,86.3,true,2024-03-25T11:40:00Z
71,Tessa,80.9,false,2024-03-26T14:05:00Z
72,Uri,95.6,true,2024-03-27T10:30:00Z
73,Violet,83.5,false,2024-03-28T13:45:00Z
74,Will,90.1,true,2024-03-29T08:10:00Z
75,Xandra,85.4,true,2024-03-30T12:35:00Z
76,York,93.9,false,2024-03-31T15:20:00Z
77,Zoe,82.7,true,2024-04-01T09:45:00Z
78,Alan,89.5,true,2024-04-02T11:00:00Z
79,Bella,78.1,false,2024-04-03T14:15:00Z
80,Colin,94.8,true,2024-04-04T10:40:00Z
81,Donna,87.2,false,2024-04-05T13:55:00Z
82,Eric,91.6,true,2024-04-06T08:20:00Z
83,Faye,84.9,true,2024-04-07T12:45:00Z
84,Garth,88.4,false,2024-04-08T15:10:00Z
85,Heidi,92.2,true,2024-04-09T09:35:00Z
86,Irene,86.7,true,2024-04-10T11:50:00Z
87,Jason,80.3,false,2024-04-11T14:20:00Z
88,Karen,95.4,true,2024-04-12T10:45:00Z
89,Lance,83.6,false,2024-04-13T13:05:00Z
90,Molly,90.7,true,2024-04-14T08:30:00Z
91,Neil,85.8,true,2024-04-15T12:55:00Z
92,Opal,93.3,false,2024-04-16T15:40:00Z
93,Pete,82.1,true,2024-04-17T09:05:00Z
94,Queen,89.8,true,2024-04-18T11:20:00Z
95,Ralph,77.4,false,2024-04-19T14:35:00Z
96,Sally,94.6,true,2024-04-20T10:00:00Z
97,Todd,87.4,false,2024-04-21T13:15:00Z
98,Unity,91.3,true,2024-04-22T08:40:00Z
99,Victor,84.5,true,2024-04-23T12:05:00Z
100,Wilma,88.2,false,2024-04-24T15:50:00Z
`

// MockS3Repository is a mock implementation of S3RepositoryInterface for testing
type MockS3Repository struct{}

// NewMockS3Repository creates a new mock S3 repository
func NewMockS3Repository() S3RepositoryInterface {
	return &MockS3Repository{}
}

// GetS3Credentials returns mock S3 credentials from a Kubernetes secret
func (r *MockS3Repository) GetS3Credentials(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	namespace string,
	secretName string,
	identity *k8s.RequestIdentity,
) (*S3Credentials, error) {
	// Fetch the secret from Kubernetes (still using real K8s client to validate secret existence)
	secret, err := client.GetSecret(ctx, namespace, secretName, identity)
	if err != nil {
		return nil, fmt.Errorf("error fetching secret '%s' from namespace %s: %w", secretName, namespace, err)
	}

	// Extract S3 credentials from secret data (case-insensitive key matching)
	creds := &S3Credentials{}
	secretData := secret.Data

	// Helper to get value from secret data case-insensitively
	getValue := func(targetKeys ...string) string {
		for secretKey, secretValue := range secretData {
			secretKeyLower := strings.ToLower(secretKey)
			for _, targetKey := range targetKeys {
				if secretKeyLower == strings.ToLower(targetKey) {
					return string(secretValue)
				}
			}
		}
		return ""
	}

	creds.AccessKeyID = getValue("AWS_ACCESS_KEY_ID")
	creds.SecretAccessKey = getValue("AWS_SECRET_ACCESS_KEY")
	creds.Region = getValue("AWS_DEFAULT_REGION")
	rawEndpoint := getValue("AWS_S3_ENDPOINT")
	creds.Bucket = getValue("AWS_S3_BUCKET") // Optional bucket name

	// Validate required fields
	if creds.AccessKeyID == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_ACCESS_KEY_ID", secretName)
	}
	if creds.SecretAccessKey == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_SECRET_ACCESS_KEY", secretName)
	}
	if creds.Region == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_DEFAULT_REGION", secretName)
	}
	if rawEndpoint == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_S3_ENDPOINT", secretName)
	}

	// For mock implementation, skip SSRF validation since we're not actually connecting to S3
	// Just store the endpoint as-is for test fixtures
	creds.EndpointURL = rawEndpoint

	return creds, nil
}

// GetS3Object returns mock file data for testing
func (r *MockS3Repository) GetS3Object(
	ctx context.Context,
	creds *S3Credentials,
	bucket string,
	key string,
) (io.Reader, string, error) {
	// Simulate file not found for non-existent files
	// This allows tests to verify 404 handling without actual S3
	if strings.Contains(key, "non-existent") {
		return nil, "", &types.NoSuchKey{}
	}

	// Return mock PDF content for .pdf files
	if strings.HasSuffix(key, ".pdf") {
		mockContent := []byte("%PDF-1.4\n%Mock PDF file for testing\n%%EOF")
		return bytes.NewReader(mockContent), "application/pdf", nil
	}

	// Return mock CSV content for .csv files
	if strings.HasSuffix(key, ".csv") {
		return bytes.NewReader([]byte(mockCSVContent)), "text/csv", nil
	}

	// Default: return generic mock content
	mockContent := []byte("Mock file content for testing")
	return bytes.NewReader(mockContent), "application/octet-stream", nil
}

// GetS3CSVSchema returns mock CSV schema for testing
func (r *MockS3Repository) GetS3CSVSchema(
	ctx context.Context,
	creds *S3Credentials,
	bucket string,
	key string,
) (CSVSchemaResult, error) {
	// Simulate file not found for non-existent files
	if strings.Contains(key, "non-existent") {
		return CSVSchemaResult{}, &types.NoSuchKey{}
	}

	// Validate that the key is a CSV file
	if !strings.HasSuffix(key, ".csv") {
		return CSVSchemaResult{}, fmt.Errorf("schema inspection is only supported for CSV files, got: %s", key)
	}

	// Validate mockCSVContent meets production requirements (minimum 100 data rows)
	// This ensures the mock behaves like production and catches test data issues early
	reader := csv.NewReader(strings.NewReader(mockCSVContent))
	reader.TrimLeadingSpace = true
	reader.LazyQuotes = true

	// Read and validate header
	_, err := reader.Read()
	if err != nil {
		return CSVSchemaResult{}, fmt.Errorf("error reading CSV header: %w", err)
	}

	// Count data rows
	rowCount := 0
	for {
		_, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err == nil {
			rowCount++
		}
	}

	// Validate minimum row count (matching production requirement in s3.go:508-510)
	if rowCount < 100 {
		return CSVSchemaResult{}, fmt.Errorf("CSV file must contain at least 100 data rows (excluding header), found %d. Only files with 100 or more lines are supported", rowCount)
	}

	// Return mock schema matching the mockCSVContent fixture
	mockSchema := []ColumnSchema{
		{
			Name: "id",
			Type: "integer",
		},
		{
			Name: "name",
			Type: "string",
		},
		{
			Name: "score",
			Type: "double",
		},
		{
			Name:   "is_active",
			Type:   "bool",
			Values: []interface{}{true, false},
		},
		{
			Name: "created_at",
			Type: "timestamp",
		},
	}

	return CSVSchemaResult{
		Columns:       mockSchema,
		ParseWarnings: 0,
	}, nil
}
