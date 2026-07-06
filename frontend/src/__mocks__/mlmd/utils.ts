export type GrpcResponse = {
  body: ArrayBuffer;
  headers: Record<string, string>;
};

export default function createGrpcResponse(data: Uint8Array): GrpcResponse {
  // create the data length bytes - there is probably a more concise way, but this works
  const dataLengthBytes = new Uint8Array(new Uint32Array([data.byteLength]).buffer);
  dataLengthBytes.reverse();
  const dataFrame = new Uint8Array(data.byteLength + 5);
  dataFrame.set([0x00], 0); // set the magic byte 0x00 to identify the data frame
  dataFrame.set(dataLengthBytes, 1); // set the length bytes
  dataFrame.set(data, 5); // set the actual data

  // you can add mock errors by tweaking the trailers string with different status codes/messages
  const trailersString = `grpc-status: 0\r\ngrpc-message: `;
  const encoder = new TextEncoder();
  const trailers = encoder.encode(trailersString);
  const trailersLengthBytes = new Uint8Array(new Uint32Array([trailers.byteLength]).buffer);
  trailersLengthBytes.reverse();
  const trailersFrame = new Uint8Array(trailers.byteLength + 5);
  trailersFrame.set([0x80], 0); // magic byte for trailers is 0x80
  trailersFrame.set(trailersLengthBytes, 1);
  trailersFrame.set(trailers, 5);

  // create the final body by combining the data frame and trailers frame
  const body = new Uint8Array(dataFrame.byteLength + trailersFrame.byteLength);
  body.set(dataFrame, 0);
  body.set(trailersFrame, dataFrame.byteLength);

  return {
    body: body.buffer,
    headers: {
      'content-type': 'application/grpc-web+proto',
    },
  };
}
