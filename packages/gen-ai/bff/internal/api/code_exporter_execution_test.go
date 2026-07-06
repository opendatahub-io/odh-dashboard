package api

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"time"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"

	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/opendatahub-io/gen-ai/internal/testutil"
)

var _ = Describe("Code Exporter Execution", func() {

	// executeGeneratedCode posts a CodeExportRequest, patches OGX_URL in the
	// generated Python, writes it to a temp file, and executes it via uv.
	// Returns the combined stdout/stderr output.
	executeGeneratedCode := func(reqBody models.CodeExportRequest) string {
		resp := MakeRequest(JSONRequest(http.MethodPost, "/gen-ai/api/v1/code-exporter?namespace="+testutil.TestNamespace, reqBody))
		defer resp.Body.Close()

		Expect(resp.StatusCode).To(Equal(http.StatusOK))

		var envelope struct {
			Data struct {
				Code string `json:"code"`
			} `json:"data"`
		}
		ReadJSONResponse(resp, &envelope)
		Expect(envelope.Data.Code).NotTo(BeEmpty(), "generated Python code must not be empty")

		port := testutil.GetTestLlamaStackPort()
		ogxURL := fmt.Sprintf("http://127.0.0.1:%d", port)
		patchedCode := strings.Replace(envelope.Data.Code, `OGX_URL = ""`, fmt.Sprintf(`OGX_URL = "%s"`, ogxURL), 1)
		Expect(patchedCode).To(ContainSubstring(ogxURL), "OGX_URL patch must have been applied")

		tmpFile, err := os.CreateTemp("", "code_export_*.py")
		Expect(err).NotTo(HaveOccurred())
		defer os.Remove(tmpFile.Name())

		_, err = tmpFile.WriteString(patchedCode)
		Expect(err).NotTo(HaveOccurred())
		Expect(tmpFile.Close()).To(Succeed())

		uvBin, err := testutil.ResolveUVBinary()
		Expect(err).NotTo(HaveOccurred(), "uv binary must be resolvable")

		ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
		defer cancel()

		cmd := exec.CommandContext(ctx, uvBin,
			"run",
			"--with", "openai==2.41.1",
			"python3", tmpFile.Name(),
		)

		output, execErr := cmd.CombinedOutput()
		outputStr := string(output)

		GinkgoWriter.Printf("--- script output ---\n%s\n--- end ---\n", outputStr)

		if execErr != nil {
			Fail(fmt.Sprintf("script execution failed: %v\nOutput:\n%s", execErr, outputStr))
		}

		return outputStr
	}

	It("should execute the basic generated script against OGX", func() {
		output := executeGeneratedCode(models.CodeExportRequest{
			Input: "Hello",
			Model: testutil.GetTestLlamaStackModel(),
		})
		Expect(output).To(ContainSubstring("agent>"))
	})

	It("should execute the generated script with system instructions against OGX", func() {
		output := executeGeneratedCode(models.CodeExportRequest{
			Input:        "Hello",
			Model:        testutil.GetTestLlamaStackModel(),
			Instructions: "You are a helpful assistant. Keep responses brief.",
		})
		Expect(output).To(ContainSubstring("agent>"))
	})
})
