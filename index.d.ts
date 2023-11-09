declare module '@metamask/eth-query' {
  // What it says on the tin. We omit `null`, as that value is used for a
  // successful response to indicate a lack of an error.
  type EverythingButNull =
    | string
    | number
    | boolean
    // eslint-disable-next-line @typescript-eslint/ban-types
    | object
    | symbol
    | undefined;

  type Json =
    | null
    | boolean
    | number
    | string
    | Json[]
    | { [prop: string]: Json };

  type JsonRpcParams = Json[] | Record<string, Json>;

  type ProviderSendAsyncResponse<Result> = {
    error?: { message: string };
    result?: Result;
  };

  type ProviderSendAsyncCallback<Result> = (
    error: unknown,
    response: ProviderSendAsyncResponse<Result>,
  ) => void;

  type Provider = {
    sendAsync<Params extends JsonRpcParams, Result>(
      payload: SendAsyncPayload<Params>,
      callback: ProviderSendAsyncCallback<Result>,
    ): void;
  };

  type SendAsyncPayload<Params extends JsonRpcParams> = {
    id: number;
    jsonrpc: '2.0';
    method: string;
    params: Params;
  };

  type SendAsyncCallback<Result> = (
    ...args:
      | [error: EverythingButNull, result: undefined]
      | [error: null, result: Result]
  ) => void;

  export default class EthQuery {
    constructor(provider: Provider);

    sendAsync<Params extends JsonRpcParams, Result>(
      opts: Partial<SendAsyncPayload<Params>>,
      callback: SendAsyncCallback<Result>,
    ): void;

    [method: string]: (...args: any[]) => void;
  }
}
