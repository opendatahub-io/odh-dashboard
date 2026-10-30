package evalhub

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTestDataRefValidate(t *testing.T) {
	tests := []struct {
		name    string
		ref     *TestDataRef
		wantErr string
	}{
		{
			name: "nil reference is valid",
			ref:  nil,
		},
		{
			name: "s3 only is valid",
			ref:  &TestDataRef{S3: &S3DataRef{Bucket: "b", Key: "k"}},
		},
		{
			name: "pvc only is valid",
			ref:  &TestDataRef{PVC: &TestDataRefPVC{ClaimName: "claim"}},
		},
		{
			name: "hf only is valid",
			ref:  &TestDataRef{HF: &TestDataRefHF{RepoID: "org/repo"}},
		},
		{
			name: "git https without secret is valid",
			ref:  &TestDataRef{Git: &TestDataRefGit{URL: "https://example.com/repo.git", Ref: "main"}},
		},
		{
			name: "git https with secret is valid",
			ref: &TestDataRef{Git: &TestDataRefGit{
				URL:       "https://example.com/repo.git",
				Ref:       "main",
				SecretRef: "my-secret",
			}},
		},
		{
			name:    "no variant set is rejected",
			ref:     &TestDataRef{},
			wantErr: "test_data_ref must specify exactly one of s3, pvc, git, or hf, got: ",
		},
		{
			name: "multiple variants set are rejected",
			ref: &TestDataRef{
				S3: &S3DataRef{Bucket: "b"},
				HF: &TestDataRefHF{RepoID: "org/repo"},
			},
			wantErr: "test_data_ref must specify exactly one of s3, pvc, git, or hf, got: s3, hf",
		},
		{
			name:    "git with non-http scheme is rejected",
			ref:     &TestDataRef{Git: &TestDataRefGit{URL: "ssh://git@example.com/repo.git"}},
			wantErr: "git test data url must be a valid http(s) url",
		},
		{
			name:    "git with empty url is rejected",
			ref:     &TestDataRef{Git: &TestDataRefGit{URL: ""}},
			wantErr: "git test data url must be a valid http(s) url",
		},
		{
			name:    "git with embedded credentials is rejected",
			ref:     &TestDataRef{Git: &TestDataRefGit{URL: "https://user:pass@example.com/repo.git"}},
			wantErr: "git test data url must not embed credentials",
		},
		{
			name:    "git with embedded credentials over http and no secret is rejected",
			ref:     &TestDataRef{Git: &TestDataRefGit{URL: "http://user:pass@example.com/repo.git", Ref: "main"}},
			wantErr: "git test data url must not embed credentials",
		},
		{
			name: "git with secret over http is rejected",
			ref: &TestDataRef{Git: &TestDataRefGit{
				URL:       "http://example.com/repo.git",
				SecretRef: "my-secret",
			}},
			wantErr: "git test data url must use https when a secret reference is provided",
		},
		{
			name: "git without secret over http is valid",
			ref:  &TestDataRef{Git: &TestDataRefGit{URL: "http://example.com/repo.git", Ref: "main"}},
		},
		{
			name: "git with relative sub_path is valid",
			ref: &TestDataRef{Git: &TestDataRefGit{
				URL:     "https://example.com/repo.git",
				Ref:     "main",
				SubPath: "data/nested",
			}},
		},
		{
			name: "pvc with relative sub_path is valid",
			ref:  &TestDataRef{PVC: &TestDataRefPVC{ClaimName: "claim", SubPath: "benchmarks/a"}},
		},
		{
			name: "hf with relative sub_path is valid",
			ref:  &TestDataRef{HF: &TestDataRefHF{RepoID: "org/repo", SubPath: "data"}},
		},
		{
			name:    "s3 key with leading slash is rejected",
			ref:     &TestDataRef{S3: &S3DataRef{Bucket: "b", Key: "/abs/path"}},
			wantErr: "s3 test data key must not start with a slash",
		},
		{
			name:    "s3 key with traversal segment is rejected",
			ref:     &TestDataRef{S3: &S3DataRef{Bucket: "b", Key: "a/../../etc"}},
			wantErr: `s3 test data key must not contain ".." segments`,
		},
		{
			name:    "pvc sub_path with traversal segment is rejected",
			ref:     &TestDataRef{PVC: &TestDataRefPVC{ClaimName: "claim", SubPath: "../escape"}},
			wantErr: `pvc test data sub_path must not contain ".." segments`,
		},
		{
			name: "git sub_path with traversal segment is rejected",
			ref: &TestDataRef{Git: &TestDataRefGit{
				URL:     "https://example.com/repo.git",
				Ref:     "main",
				SubPath: "a/..\\../b",
			}},
			wantErr: `git test data sub_path must not contain ".." segments`,
		},
		{
			name:    "hf sub_path with leading slash is rejected",
			ref:     &TestDataRef{HF: &TestDataRefHF{RepoID: "org/repo", SubPath: "/abs"}},
			wantErr: "hf test data sub_path must not start with a slash",
		},
		{
			name:    "pvc with missing claim_name is rejected",
			ref:     &TestDataRef{PVC: &TestDataRefPVC{SubPath: "data"}},
			wantErr: "pvc test data claim_name must not be empty",
		},
		{
			name:    "pvc with whitespace claim_name is rejected",
			ref:     &TestDataRef{PVC: &TestDataRefPVC{ClaimName: "  "}},
			wantErr: "pvc test data claim_name must not be empty",
		},
		{
			name:    "pvc with space-padded claim_name is rejected",
			ref:     &TestDataRef{PVC: &TestDataRefPVC{ClaimName: " claim "}},
			wantErr: "pvc test data claim_name must be an RFC 1123 DNS label",
		},
		{
			name: "pvc with 63 character claim_name is valid",
			ref:  &TestDataRef{PVC: &TestDataRefPVC{ClaimName: strings.Repeat("a", 63)}},
		},
		{
			name:    "pvc with 64 character claim_name is rejected",
			ref:     &TestDataRef{PVC: &TestDataRefPVC{ClaimName: strings.Repeat("a", 64)}},
			wantErr: "pvc test data claim_name must be at most 63 characters, got 64",
		},
		{
			name:    "pvc with dotted claim_name is rejected",
			ref:     &TestDataRef{PVC: &TestDataRefPVC{ClaimName: "eval.data"}},
			wantErr: "pvc test data claim_name must be an RFC 1123 DNS label",
		},
		{
			name:    "pvc with uppercase claim_name is rejected",
			ref:     &TestDataRef{PVC: &TestDataRefPVC{ClaimName: "EvalData"}},
			wantErr: "pvc test data claim_name must be an RFC 1123 DNS label",
		},
		{
			name:    "git with missing ref is rejected",
			ref:     &TestDataRef{Git: &TestDataRefGit{URL: "https://example.com/repo.git"}},
			wantErr: "git test data ref must not be empty",
		},
		{
			name:    "hf with missing repo_id is rejected",
			ref:     &TestDataRef{HF: &TestDataRefHF{SubPath: "data"}},
			wantErr: "hf test data repo_id must not be empty",
		},
		{
			name: "s3 with data_set type is valid",
			ref:  &TestDataRef{Type: TestDataRefTypeDataSet, S3: &S3DataRef{Bucket: "b", Key: "k"}},
		},
		{
			name: "s3 with pre_recorded_data type is valid",
			ref:  &TestDataRef{Type: TestDataRefTypePreRecordedData, S3: &S3DataRef{Bucket: "b", Key: "k"}},
		},
		{
			name:    "s3 with unsupported type is rejected",
			ref:     &TestDataRef{Type: "dataset", S3: &S3DataRef{Bucket: "b", Key: "k"}},
			wantErr: `test_data_ref type must be "data_set" or "pre_recorded_data"`,
		},
		{
			name:    "pvc with unsupported type is rejected",
			ref:     &TestDataRef{Type: "random", PVC: &TestDataRefPVC{ClaimName: "claim"}},
			wantErr: `test_data_ref type must be "data_set" or "pre_recorded_data"`,
		},
		{
			name: "git with pre_recorded_data type is valid",
			ref: &TestDataRef{
				Type: TestDataRefTypePreRecordedData,
				Git:  &TestDataRefGit{URL: "https://example.com/repo.git", Ref: "main"},
			},
		},
		{
			name: "git with unsupported type is rejected",
			ref: &TestDataRef{
				Type: "bogus",
				Git:  &TestDataRefGit{URL: "https://example.com/repo.git", Ref: "main"},
			},
			wantErr: `test_data_ref type must be "data_set" or "pre_recorded_data"`,
		},
		{
			name: "hf with data_set type is valid",
			ref:  &TestDataRef{Type: TestDataRefTypeDataSet, HF: &TestDataRefHF{RepoID: "org/repo"}},
		},
		{
			name:    "hf with unsupported type is rejected",
			ref:     &TestDataRef{Type: "responses", HF: &TestDataRefHF{RepoID: "org/repo"}},
			wantErr: `test_data_ref type must be "data_set" or "pre_recorded_data"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.ref.Validate()
			if tt.wantErr == "" {
				require.NoError(t, err)
				return
			}
			require.Error(t, err)
			assert.Contains(t, err.Error(), tt.wantErr)
		})
	}
}
