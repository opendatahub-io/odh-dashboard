#!/usr/bin/env python3

import requests
import json

# Test the vector DB registration as documented
base_url = "http://lsd-llama-milvus-llama-stack.apps.rosa.e8a7l7t5a1a1z2m.cusw.p3.openshiftapps.com"

def test_vector_db_registration():
    """Test registering a vector DB as documented."""
    
    # First, let's check what vector_io providers are available
    print("=== Checking available vector_io providers ===")
    response = requests.get(f"{base_url}/v1/providers?api=vector_io")
    if response.status_code == 200:
        providers = response.json()
        print("Available vector_io providers:")
        for provider in providers.get('data', []):
            print(f"  - {provider['provider_id']} ({provider['provider_type']})")
    else:
        print(f"Error getting providers: {response.status_code}")
        return
    
    # Test registering vector DB as documented 
    print("\n=== Testing vector DB registration ===")
    vector_db_data = {
        "vector_db_id": "test-remote-milvus",
        "embedding_model": "granite-embedding-125m", 
        "embedding_dimension": 768,
        "provider_id": "remote-milvus"  # As documented
    }
    
    response = requests.post(f"{base_url}/v1/vector_dbs/register", json=vector_db_data)
    print(f"Registration response: {response.status_code}")
    print(f"Response body: {response.text}")
    
    # Also try with the current provider_id from the working setup
    print("\n=== Testing with current milvus provider ===")
    vector_db_data_current = {
        "vector_db_id": "test-milvus",
        "embedding_model": "granite-embedding-125m", 
        "embedding_dimension": 768,
        "provider_id": "milvus"  # Current working provider
    }
    
    response = requests.post(f"{base_url}/v1/vector_dbs/register", json=vector_db_data_current)
    print(f"Registration response: {response.status_code}")
    print(f"Response body: {response.text}")

if __name__ == "__main__":
    test_vector_db_registration()
