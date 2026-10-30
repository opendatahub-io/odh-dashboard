// Modules -------------------------------------------------------------------->

// Types ---------------------------------------------------------------------->

// Globals -------------------------------------------------------------------->

const python = (
  namespace: string,
  connectionId: string,
) => String.raw`# Requires Python 3.11+. Install in your terminal first:
# python -m pip install "data-connect-hub[flight]"
# Set these environment variables in the terminal running your script or notebook:
# export DCH_ENDPOINT="<your-dch-gateway-host>:8443"
# export DCH_TOKEN="<your-bearer-token-without-the-Bearer-prefix>"
# For tabular data, replace the SQL with a query for your source:
# export DCH_SQL="SELECT * FROM your_table LIMIT 100"
# For binary data, set the path of the object to download:
# export DCH_OBJECT_PATH="path/to/your/file.bin"
# Save the Python below as ingest.py and run: python ingest.py

import os
from pathlib import Path
from tempfile import TemporaryDirectory

from data_connect_hub import DataConnectClient

CONNECTION_ID = ${JSON.stringify(connectionId)}
NAMESPACE = ${JSON.stringify(namespace)}

# DCH uses this connection's saved credentials to access the source.
with DataConnectClient(
    endpoint=os.environ["DCH_ENDPOINT"],
    token=os.environ["DCH_TOKEN"],
    tenant_id=NAMESPACE,
    # For a private CA, add: ca_cert="/path/to/cluster-ca.pem"
) as client:
    client.check_connection_readiness(CONNECTION_ID)
    connection = client.get_connection(CONNECTION_ID)
    if connection.status.state != "ready":
        raise RuntimeError(
            f"Connection is {connection.status.state}: {connection.status.message}"
        )

    if connection.format == "tabular":
        # Stream Arrow batches over Flight SQL without loading all rows into memory.
        sql = os.environ["DCH_SQL"]
        destination = Path("ingested-data.csv")
        row_count = 0
        with destination.open("w", encoding="utf-8", newline="") as output:
            for batch in client.read_batches(sql, connection_id=CONNECTION_ID):
                frame = batch.to_pandas()
                frame.to_csv(output, index=False, header=(row_count == 0))
                row_count += len(frame)
        print(f"Ingested {row_count} rows into {destination.resolve()}")
        # Use the CSV in your training or analysis workflow.
    else:
        # Stream binary objects, such as documents, images, or model artifacts.
        object_path = os.environ["DCH_OBJECT_PATH"]
        destination = Path("ingested-object.bin")
        with TemporaryDirectory(dir=destination.parent) as temporary_directory:
            temporary_path = Path(temporary_directory) / destination.name
            with temporary_path.open("wb") as output:
                for chunk in client.download_binary(CONNECTION_ID, object_path):
                    output.write(chunk)
            temporary_path.replace(destination)
        print(f"Downloaded data to {destination.resolve()}")`;

const bash = (
  namespace: string,
  connectionId: string,
) => String.raw`# Run these commands in Bash with curl installed.
# Set the gateway and your bearer token (without the Bearer prefix).
export DCH_ENDPOINT="https://<your-dch-gateway-host>:8443"
export DCH_TOKEN="<your-bearer-token>"
export DCH_NAMESPACE='${namespace.replace(/'/g, "'\\''")}'
export DCH_CONNECTION_ID='${connectionId.replace(/'/g, "'\\''")}'

# For a private CA, add --cacert /path/to/cluster-ca.pem to each curl command.

# Refresh connection readiness using its saved credentials.
curl --fail-with-body --silent --show-error \
  --request POST \
  --header "Authorization: Bearer $DCH_TOKEN" \
  --header "x-tenant-id: $DCH_NAMESPACE" \
  "$DCH_ENDPOINT/api/v1alpha1/data/connections/$DCH_CONNECTION_ID/readiness"

# Inspect the connection; status.state should be "ready" before ingestion.
curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer $DCH_TOKEN" \
  --header "x-tenant-id: $DCH_NAMESPACE" \
  "$DCH_ENDPOINT/api/v1alpha1/data/connections/$DCH_CONNECTION_ID"

# Download an object from this binary connection to a local file.
# Replace this connector-specific path with your object key or file path.
export DCH_OBJECT_PATH="path/to/your/file.bin"
curl --fail --silent --show-error \
  --header "Authorization: Bearer $DCH_TOKEN" \
  --header "x-tenant-id: $DCH_NAMESPACE" \
  --get \
  --data-urlencode "path=$DCH_OBJECT_PATH" \
  --output ingested-object.bin \
  "$DCH_ENDPOINT/api/v1alpha1/data/connections/$DCH_CONNECTION_ID/binary"

# REST API reference: https://opendatahub-io.github.io/data-connect-hub/`;

// Public --------------------------------------------------------------------->

export { python, bash };
