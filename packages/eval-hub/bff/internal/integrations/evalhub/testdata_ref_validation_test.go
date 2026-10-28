package evalhub

import (
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
			ref:  &TestDataRef{Git: &TestDataRefGit{URL: "http://example.com/repo.git"}},
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
