package llamastack

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
)

var fileIDPattern = regexp.MustCompile(`^file-[a-f0-9]+$`)

// InputContentPart represents a single content part in a multimodal input.
type InputContentPart struct {
	Type   string `json:"type"`
	Text   string `json:"text,omitempty"`
	FileID string `json:"file_id,omitempty"`
}

// InputUnion represents input that can be either a plain string or an array of content parts.
type InputUnion struct {
	Text  string
	Parts []InputContentPart
}

func (u *InputUnion) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		u.Text = s
		u.Parts = nil
		return nil
	}
	var parts []InputContentPart
	if err := json.Unmarshal(data, &parts); err == nil {
		u.Text = ""
		u.Parts = parts
		return nil
	}
	return fmt.Errorf("input must be a string or array of content parts")
}

func (u InputUnion) MarshalJSON() ([]byte, error) {
	if len(u.Parts) > 0 {
		return json.Marshal(u.Parts)
	}
	return json.Marshal(u.Text)
}

func (u InputUnion) IsMultimodal() bool {
	return len(u.Parts) > 0
}

// TextContent extracts only the text portions, joining them with spaces.
// For string input, returns the string directly. For multimodal input,
// concatenates all input_text parts (skipping images). Used by NeMo
// guardrails which only moderate text.
func (u InputUnion) TextContent() string {
	if !u.IsMultimodal() {
		return u.Text
	}
	var texts []string
	for _, p := range u.Parts {
		if p.Type == "input_text" {
			texts = append(texts, p.Text)
		}
	}
	return strings.Join(texts, " ")
}

// ContentUnion is a type alias for InputUnion, used for ChatContextMessage.Content
// to provide semantic clarity between "current input" and "history content".
type ContentUnion = InputUnion

func ValidateFileID(fileID string) error {
	if fileID == "" {
		return errors.New("file_id is required for input_image; upload a file via POST /lsd/files first")
	}
	if !fileIDPattern.MatchString(fileID) {
		return fmt.Errorf("invalid file_id %q; expected format 'file-<hex>' from the file upload endpoint", fileID)
	}
	return nil
}

func ValidateInputParts(parts []InputContentPart) error {
	if len(parts) == 0 {
		return errors.New("input array must contain at least one content part")
	}
	for _, p := range parts {
		switch p.Type {
		case "input_text":
			if p.Text == "" {
				return errors.New("input_text part requires non-empty text")
			}
		case "input_image":
			if err := ValidateFileID(p.FileID); err != nil {
				return err
			}
		default:
			return fmt.Errorf("unsupported content part type %q; expected 'input_text' or 'input_image'", p.Type)
		}
	}
	return nil
}

func CountImageParts(input InputUnion, chatContext []ChatContextMessage) int {
	count := 0
	if input.IsMultimodal() {
		for _, p := range input.Parts {
			if p.Type == "input_image" {
				count++
			}
		}
	}
	for _, msg := range chatContext {
		if msg.Content.IsMultimodal() {
			for _, p := range msg.Content.Parts {
				if p.Type == "input_image" {
					count++
				}
			}
		}
	}
	return count
}
