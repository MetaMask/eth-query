declare module 'json-rpc-random-id' {
  // This is the name of the function.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  export default function IdIterator(opts?: {
    max?: number;
    start?: number;
  }): () => number;
}
