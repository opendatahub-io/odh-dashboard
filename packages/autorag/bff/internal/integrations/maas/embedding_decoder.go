package maas

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
)

// decodeEmbeddingResponse reads vectors one number at a time. This prevents
// encoding/json (or the SDK) from materializing an attacker-controlled array
// before the result and dimension limits are applied.
func decodeEmbeddingResponse(reader io.Reader) ([][]float32, error) {
	decoder := json.NewDecoder(reader)
	token, err := decoder.Token()
	if err != nil {
		return nil, err
	}
	if token != json.Delim('{') {
		return nil, errors.New("embedding response must be an object")
	}
	var vectors [][]float32
	seenData := false
	for decoder.More() {
		keyToken, err := decoder.Token()
		if err != nil {
			return nil, err
		}
		key, ok := keyToken.(string)
		if !ok {
			return nil, errors.New("embedding response property must be a string")
		}
		if key == "data" {
			if seenData {
				return nil, errors.New("embedding response contains duplicate data")
			}
			seenData = true
			vectors, err = decodeEmbeddingData(decoder)
			if err != nil {
				return nil, err
			}
			continue
		}
		if err := skipJSONValue(decoder); err != nil {
			return nil, err
		}
	}
	if _, err := decoder.Token(); err != nil {
		return nil, err
	}
	if token, err := decoder.Token(); err != io.EOF {
		if err == nil {
			return nil, fmt.Errorf("unexpected trailing JSON value %v", token)
		}
		return nil, err
	}
	return vectors, nil
}

func decodeEmbeddingData(decoder *json.Decoder) ([][]float32, error) {
	token, err := decoder.Token()
	if err != nil {
		return nil, err
	}
	if token != json.Delim('[') {
		return nil, errors.New("embedding data must be an array")
	}
	var vectors [][]float32
	for decoder.More() {
		if len(vectors) >= maxEmbeddingResults {
			return nil, fmt.Errorf("response contains more than %d vectors", maxEmbeddingResults)
		}
		vector, err := decodeEmbeddingItem(decoder)
		if err != nil {
			return nil, err
		}
		vectors = append(vectors, vector)
	}
	_, err = decoder.Token()
	return vectors, err
}

func decodeEmbeddingItem(decoder *json.Decoder) ([]float32, error) {
	token, err := decoder.Token()
	if err != nil {
		return nil, err
	}
	if token != json.Delim('{') {
		return nil, errors.New("embedding item must be an object")
	}
	var vector []float32
	seenEmbedding := false
	for decoder.More() {
		keyToken, err := decoder.Token()
		if err != nil {
			return nil, err
		}
		key := keyToken.(string)
		if key != "embedding" {
			if err := skipJSONValue(decoder); err != nil {
				return nil, err
			}
			continue
		}
		if seenEmbedding {
			return nil, errors.New("embedding item contains duplicate embedding")
		}
		seenEmbedding = true
		vector, err = decodeEmbeddingVector(decoder)
		if err != nil {
			return nil, err
		}
	}
	if _, err := decoder.Token(); err != nil {
		return nil, err
	}
	return vector, nil
}

func decodeEmbeddingVector(decoder *json.Decoder) ([]float32, error) {
	token, err := decoder.Token()
	if err != nil {
		return nil, err
	}
	if token != json.Delim('[') {
		return nil, errors.New("embedding must be an array")
	}
	vector := make([]float32, 0, min(maxEmbeddingVectorDimensions, 1024))
	for decoder.More() {
		if len(vector) >= maxEmbeddingVectorDimensions {
			return nil, fmt.Errorf("vector exceeds the maximum supported dimension of %d", maxEmbeddingVectorDimensions)
		}
		var value float64
		if err := decoder.Decode(&value); err != nil {
			return nil, err
		}
		vector = append(vector, float32(value))
	}
	_, err = decoder.Token()
	return vector, err
}

func skipJSONValue(decoder *json.Decoder) error {
	token, err := decoder.Token()
	if err != nil {
		return err
	}
	if delimiter, ok := token.(json.Delim); ok && (delimiter == '{' || delimiter == '[') {
		depth := 1
		for depth > 0 {
			token, err = decoder.Token()
			if err != nil {
				return err
			}
			if delimiter, ok := token.(json.Delim); ok {
				switch delimiter {
				case '{', '[':
					depth++
				case '}', ']':
					depth--
				}
			}
		}
	}
	return nil
}
