package api

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
)

// responsesJSONPreflight counts bounded arrays and objects while the decoder
// still holds no request graph. The raw body is already capped by the handler,
// so this pass does not create a second unbounded representation of the body.
type responsesJSONPreflight struct {
	inputMessages  int
	totalContent   int
	tools          int
	totalVectorIDs int
	includeItems   int
}

func preflightResponsesJSON(body []byte) error {
	decoder := json.NewDecoder(bytes.NewReader(body))
	limits := &responsesJSONPreflight{}
	if err := limits.scanValue(decoder, nil); err != nil {
		return err
	}
	if token, err := decoder.Token(); err != io.EOF {
		if err != nil {
			return err
		}
		return fmt.Errorf("body must only contain a single JSON value (found %v)", token)
	}
	return nil
}

func (p *responsesJSONPreflight) scanValue(decoder *json.Decoder, path []string) error {
	token, err := decoder.Token()
	if err != nil {
		return err
	}
	switch delimiter := token.(type) {
	case json.Delim:
		switch delimiter {
		case '{':
			return p.scanObject(decoder, path)
		case '[':
			return p.scanArray(decoder, path)
		}
	case string:
		if len(delimiter) > maxResponsesStringBytes {
			return fmt.Errorf("%s exceeds the maximum supported size of %d bytes", responsePath(path), maxResponsesStringBytes)
		}
	case nil:
		if responsePath(path) == "tool_choice" {
			return errors.New("tool_choice must be an object when provided")
		}
	}
	return nil
}

func (p *responsesJSONPreflight) scanObject(decoder *json.Decoder, path []string) error {
	properties := 0
	seen := make(map[string]struct{})
	for decoder.More() {
		keyToken, err := decoder.Token()
		if err != nil {
			return err
		}
		key, ok := keyToken.(string)
		if !ok {
			return errors.New("object key must be a string")
		}
		if len(key) > maxResponsesStringBytes {
			return fmt.Errorf("%s exceeds the maximum supported size of %d bytes", responsePath(path), maxResponsesStringBytes)
		}
		if _, duplicate := seen[key]; duplicate {
			return fmt.Errorf("%s contains duplicate property %q", responsePath(path), key)
		}
		seen[key] = struct{}{}
		if !isAllowedResponseProperty(path, key) {
			return fmt.Errorf("%s contains unknown property %q", responsePath(path), key)
		}
		properties++
		if limit := responseObjectLimit(path); limit > 0 && properties > limit {
			return fmt.Errorf("%s must not contain more than %d properties", responsePath(path), limit)
		}
		if err := p.scanValue(decoder, append(path, key)); err != nil {
			return err
		}
	}
	_, err := decoder.Token()
	return err
}

func isAllowedResponseProperty(path []string, key string) bool {
	if len(path) == 0 {
		switch key {
		case "model", "input", "instructions", "tools", "tool_choice", "store", "include", "metadata", "stream", "temperature", "max_output_tokens":
			return true
		}
		return false
	}
	switch path[len(path)-1] {
	case "input":
		return key == "type" || key == "role" || key == "content"
	case "content":
		return key == "type" || key == "text"
	case "tools":
		return key == "type" || key == "vector_store_ids" || key == "max_num_results" || key == "ranking_options"
	case "tool_choice":
		return key == "type"
	case "ranking_options":
		return key == "ranker" || key == "alpha"
	case "metadata":
		return true
	default:
		return false
	}
}

func (p *responsesJSONPreflight) scanArray(decoder *json.Decoder, path []string) error {
	items := 0
	for decoder.More() {
		items++
		if limit := responseArrayLimit(path); limit > 0 && items > limit {
			return fmt.Errorf("%s must not contain more than %d items", responsePath(path), limit)
		}
		switch responsePath(path) {
		case "input":
			p.inputMessages++
			if p.inputMessages > maxResponsesTotalInputMessages {
				return fmt.Errorf("input must not contain more than %d messages in total", maxResponsesTotalInputMessages)
			}
		case "content":
			p.totalContent++
			if p.totalContent > maxResponsesTotalContent {
				return fmt.Errorf("input content must not contain more than %d items in total", maxResponsesTotalContent)
			}
		case "tools":
			p.tools++
			if p.tools > maxResponsesTotalTools {
				return fmt.Errorf("tools must not contain more than %d items in total", maxResponsesTotalTools)
			}
		case "vector_store_ids":
			p.totalVectorIDs++
			if p.totalVectorIDs > maxResponsesTotalVectorIDs {
				return fmt.Errorf("vector_store_ids must not contain more than %d items in total", maxResponsesTotalVectorIDs)
			}
		case "include":
			p.includeItems++
			if p.includeItems > maxResponsesTotalIncludeItems {
				return fmt.Errorf("include must not contain more than %d items in total", maxResponsesTotalIncludeItems)
			}
		}
		if err := p.scanValue(decoder, path); err != nil {
			return err
		}
	}
	_, err := decoder.Token()
	return err
}

func responsePath(path []string) string {
	if len(path) == 0 {
		return "request"
	}
	return path[len(path)-1]
}

func responseArrayLimit(path []string) int {
	switch responsePath(path) {
	case "input":
		return maxResponsesInputMessages
	case "content":
		return maxResponsesContentItems
	case "tools":
		return maxResponsesTools
	case "vector_store_ids":
		return maxResponsesVectorStoreIDs
	case "include":
		return maxResponsesIncludeItems
	default:
		return 0
	}
}

func responseObjectLimit(path []string) int {
	if len(path) == 0 {
		return maxResponsesRootProperties
	}
	switch path[len(path)-1] {
	case "input":
		return maxResponsesMessageFields
	case "content":
		return maxResponsesContentFields
	case "tools":
		return maxResponsesToolFields
	case "tool_choice":
		return maxResponsesToolChoiceFields
	case "ranking_options":
		return maxResponsesRankingFields
	case "metadata":
		return maxResponsesMetadataItems
	default:
		return 0
	}
}
