package mocks

import (
	"context"
	"io"

	"github.com/stretchr/testify/mock"
)

type MockHTTPClient struct {
	mock.Mock
}

func (m *MockHTTPClient) GET(url string) ([]byte, error) {
	args := m.Called(url)
	return args.Get(0).([]byte), args.Error(1)
}

func (m *MockHTTPClient) POST(url string, body io.Reader) ([]byte, error) {
	args := m.Called(url, body)
	return args.Get(0).([]byte), args.Error(1)
}

func (m *MockHTTPClient) PATCH(url string, body io.Reader) ([]byte, error) {
	args := m.Called(url, body)
	return args.Get(0).([]byte), args.Error(1)
}

func (m *MockHTTPClient) DELETE(url string) ([]byte, error) {
	args := m.Called(url)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]byte), args.Error(1)
}

func (m *MockHTTPClient) GETWithContext(ctx context.Context, url string) ([]byte, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return m.GET(url)
}
