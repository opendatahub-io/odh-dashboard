.PHONY: build run clean

PORT ?= 4001

build:
	go build -o bin/bff ./cmd

run: build
	./bin/bff --port=$(PORT)

clean:
	rm -rf bin/
