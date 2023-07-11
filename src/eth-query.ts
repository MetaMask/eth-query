import createRandomIdFactory from 'json-rpc-random-id';

const createRandomId = createRandomIdFactory();

/**
 * Makes a subset of an object type optional.
 */
type PickPartial<Type, Keys extends keyof Type> = { [Key in Keys]?: Type[Key] };

/**
 * What it says on the tin. We omit `null` as that value is used for a
 * successful response to indicate a lack of an error.
 */
type EverythingButNull =
  | string
  | number
  | boolean
  // We mean to use `object` here.
  // eslint-disable-next-line @typescript-eslint/ban-types
  | object
  | symbol
  | undefined;

/**
 * A singular (non-collection) value within a request parameter list.
 */
type SimpleParam = string | number | boolean | null;

/**
 * The base type for the params that a request takes.
 */
type BaseParams = (SimpleParam | Record<string, SimpleParam>)[];

/**
 * The type of the `payload` for `sendAsync`.
 */
type SendAsyncPayload<Params extends BaseParams> = {
  id: number;
  jsonrpc: '2.0';
  method: string;
  params: Params;
};

/**
 * The type of the `callback` for `sendAsync`.
 */
type SendAsyncCallback<Result> = (
  ...args:
    | [error: EverythingButNull, result: undefined]
    | [error: null, result: Result]
) => void;

/**
 * The type of the `response` for the provider object.
 */
type ProviderSendAsyncResponse<Result> = {
  error?: { message: string };
  result?: Result;
};

/**
 * The type of the `callback` for the provider object's `sendAsync` method.
 */
type ProviderSendAsyncCallback<Result> = (
  error: unknown,
  response: ProviderSendAsyncResponse<Result>,
) => void;

/**
 * An Ethereum provider object. Although it may contain other methods, all we
 * care about in this library is `sendAsync`.
 */
export type Provider = {
  sendAsync<Params extends BaseParams, Result>(
    payload: SendAsyncPayload<Params>,
    callback: ProviderSendAsyncCallback<Result>,
  ): void;
};

/**
 * Generates an instance method designed to call an RPC method. This instance
 * method uses `sendAsync` internally to make the request to the network.
 *
 * @param methodName - The RPC method.
 * @returns The generated method.
 */
function generateFnFor<Params extends BaseParams>(methodName: string) {
  return function (
    this: EthQuery,
    ...args: [...Params, SendAsyncCallback<Params>]
  ) {
    const callback = args.pop();
    // Typecast: The remaining arguments must be the params.
    const params = args.slice(0, -1) as Params;
    if (callback === undefined) {
      throw new Error('Could not find callback');
    }
    if (typeof callback !== 'function') {
      throw new Error('Callback is not a function');
    }
    // We are inside EthQuery at this point.
    // eslint-disable-next-line no-invalid-this
    this.sendAsync(
      {
        method: methodName,
        params,
      },
      callback,
    );
  };
}

/**
 * Generates an instance method designed to call an RPC method that takes a
 * block parameter, but where the API is simplified such that this parameter can
 * be omitted, in which case it is filled in with "latest". Once this occurs,
 * the generated instance method uses `sendAsync` internally to make the request
 * to the network.
 *
 * @param argCount - The number of parameters that the RPC method is
 * expected to take.
 * @param methodName - The RPC method.
 * @returns The generated method.
 */
function generateFnWithDefaultBlockFor<Params extends BaseParams>(
  argCount: number,
  methodName: string,
) {
  return function (
    this: EthQuery,
    ...args: [...Params, SendAsyncCallback<Params>]
  ) {
    const callback = args.pop();
    // Typecast: The remaining arguments must be the params.
    const params = args.slice(0, -1) as Params;
    if (callback === undefined) {
      throw new Error('Could not find callback');
    }
    if (typeof callback !== 'function') {
      throw new Error('Callback is not a function');
    }
    // set optional default block param
    if (params.length < argCount) {
      params.push('latest');
    }
    // We are inside EthQuery at this point.
    // eslint-disable-next-line no-invalid-this
    this.sendAsync(
      {
        method: methodName,
        params,
      },
      callback,
    );
  };
}

/**
 * Builds a complete request payload object from a partial version.
 *
 * @param data - The partial request object.
 * @returns The complete request object.
 */
function createPayload<Params extends BaseParams>(
  data: PickPartial<SendAsyncPayload<Params>, 'id' | 'jsonrpc' | 'params'> &
    Pick<SendAsyncPayload<Params>, 'method'>,
): SendAsyncPayload<Params> {
  return Object.assign(
    {},
    {
      // defaults
      id: createRandomId(),
      jsonrpc: '2.0',
      params: [],
    },
    // user-specified
    data,
  );
}

/**
 * Wrapping an Ethereum provider object, EthQuery provides some conveniences
 * around making requests to an RPC endpoint:
 *
 * - Each of the RPC methods in the Ethereum spec may be requested not only
 * via `sendAsync`, but also via its own instance method, whose API is suited
 * for the RPC method.
 * - When requesting an RPC method, `id` and `jsonrpc` do not need to be
 * specified and are filled in with reasonable defaults.
 * - The mechanics of `sendAsync` (or any of the RPC-method-specific instance
 * methods) are simplified such that its callback will be called with an error
 * argument not only if the callback on the provider's `sendAsync` method was
 * called with an argument, but also if the `response` object has an `error`
 * property.
 */
export class EthQuery {
  /**
   * The Ethereum provider that the EthQuery is wrapping.
   */
  currentProvider: Provider;

  /**
   * Constructs an EthQuery.
   *
   * @param provider - The Ethereum provider.
   */
  constructor(provider: Provider) {
    this.currentProvider = provider;
  }

  /**
   * Makes an `eth_getBalance` request, filling in the block param with "latest"
   * if not given.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getBalance = generateFnWithDefaultBlockFor(2, 'eth_getBalance');

  /**
   * Makes an `eth_getCode` request, filling in the block param with "latest"
   * if not given.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getCode = generateFnWithDefaultBlockFor(2, 'eth_getCode');

  /**
   * Makes an `eth_getTransactionCount` request, filling in the block param with
   * "latest" if not given.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getTransactionCount = generateFnWithDefaultBlockFor(
    2,
    'eth_getTransactionCount',
  );

  /**
   * Makes an `eth_getStorageAt` request, filling in the block param with
   * "latest" if not given.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getStorageAt = generateFnWithDefaultBlockFor(3, 'eth_getStorageAt');

  /**
   * Makes an `eth_call` request, filling in the block param with "latest" if
   * not given.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  call = generateFnWithDefaultBlockFor(2, 'eth_call');

  /**
   * Makes an `eth_protocolVersion` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  protocolVersion = generateFnFor('eth_protocolVersion');

  /**
   * Makes an `eth_syncing` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  syncing = generateFnFor('eth_syncing');

  /**
   * Makes an `eth_coinbase` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  coinbase = generateFnFor('eth_coinbase');

  /**
   * Makes an `eth_mining` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  mining = generateFnFor('eth_mining');

  /**
   * Makes an `eth_hashrate` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  hashrate = generateFnFor('eth_hashrate');

  /**
   * Makes an `eth_gasPrice` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  gasPrice = generateFnFor('eth_gasPrice');

  /**
   * Makes an `eth_accounts` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  accounts = generateFnFor('eth_accounts');

  /**
   * Makes an `eth_blockNumber` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  blockNumber = generateFnFor('eth_blockNumber');

  /**
   * Makes an `eth_getBlockTransactionCountByHash` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getBlockTransactionCountByHash = generateFnFor(
    'eth_getBlockTransactionCountByHash',
  );

  /**
   * Makes an `eth_getBlockTransactionCountByNumber` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getBlockTransactionCountByNumber = generateFnFor(
    'eth_getBlockTransactionCountByNumber',
  );

  /**
   * Makes an `eth_getUncleCountByBlockHash` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getUncleCountByBlockHash = generateFnFor('eth_getUncleCountByBlockHash');

  /**
   * Makes an `eth_getUncleCountByBlockNumber` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getUncleCountByBlockNumber = generateFnFor('eth_getUncleCountByBlockNumber');

  /**
   * Makes an `eth_sign` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  sign = generateFnFor('eth_sign');

  /**
   * Makes an `eth_sendTransaction` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  sendTransaction = generateFnFor('eth_sendTransaction');

  /**
   * Makes an `eth_sendRawTransaction` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  sendRawTransaction = generateFnFor('eth_sendRawTransaction');

  /**
   * Makes an `eth_estimateGas` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  estimateGas = generateFnFor('eth_estimateGas');

  /**
   * Makes an `eth_getBlockByHash` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getBlockByHash = generateFnFor('eth_getBlockByHash');

  /**
   * Makes an `eth_getBlockByNumber` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getBlockByNumber = generateFnFor('eth_getBlockByNumber');

  /**
   * Makes an `eth_getTransactionByHash` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getTransactionByHash = generateFnFor('eth_getTransactionByHash');

  /**
   * Makes an `eth_getTransactionByBlockHashAndIndex` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getTransactionByBlockHashAndIndex = generateFnFor(
    'eth_getTransactionByBlockHashAndIndex',
  );

  /**
   * Makes an `eth_getTransactionByBlockNumberAndIndex` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getTransactionByBlockNumberAndIndex = generateFnFor(
    'eth_getTransactionByBlockNumberAndIndex',
  );

  /**
   * Makes an `eth_getTransactionReceipt` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getTransactionReceipt = generateFnFor('eth_getTransactionReceipt');

  /**
   * Makes an `eth_getUncleByBlockHashAndIndex` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getUncleByBlockHashAndIndex = generateFnFor(
    'eth_getUncleByBlockHashAndIndex',
  );

  /**
   * Makes an `eth_getUncleByBlockNumberAndIndex` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getUncleByBlockNumberAndIndex = generateFnFor(
    'eth_getUncleByBlockNumberAndIndex',
  );

  /**
   * Makes an `eth_getCompilers` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getCompilers = generateFnFor('eth_getCompilers');

  /**
   * Makes an `eth_compileLLL` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  compileLLL = generateFnFor('eth_compileLLL');

  /**
   * Makes an `eth_compileSolidity` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  compileSolidity = generateFnFor('eth_compileSolidity');

  /**
   * Makes an `eth_compileSerpent` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  compileSerpent = generateFnFor('eth_compileSerpent');

  /**
   * Makes an `eth_newFilter` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  newFilter = generateFnFor('eth_newFilter');

  /**
   * Makes an `eth_newBlockFilter` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  newBlockFilter = generateFnFor('eth_newBlockFilter');

  /**
   * Makes an `eth_newPendingTransactionFilter` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  newPendingTransactionFilter = generateFnFor(
    'eth_newPendingTransactionFilter',
  );

  /**
   * Makes an `eth_uninstallFilter` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  uninstallFilter = generateFnFor('eth_uninstallFilter');

  /**
   * Makes an `eth_getFilterChanges` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getFilterChanges = generateFnFor('eth_getFilterChanges');

  /**
   * Makes an `eth_getFilterLogs` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getFilterLogs = generateFnFor('eth_getFilterLogs');

  /**
   * Makes an `eth_getLogs` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getLogs = generateFnFor('eth_getLogs');

  /**
   * Makes an `eth_getWork` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  getWork = generateFnFor('eth_getWork');

  /**
   * Makes an `eth_submitWork` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  submitWork = generateFnFor('eth_submitWork');

  /**
   * Makes an `eth_submitHashrate` request.
   *
   * @param args - The params for the request followed by a callback, which will
   * be called with an error value or a result value depending on the outcome of
   * the request.
   */
  submitHashrate = generateFnFor('eth_submitHashrate');

  /**
   * Makes a request for a particular RPC method.
   *
   * @param opts - The JSON-RPC payload. Must include `method`, but may include
   * `id`, `jsonrpc`, or `params`; reasonable defaults will be used for any
   * omitted properties.
   * @param callback - A function which will be called with an error value or a
   * result value depending on the outcome of the request.
   */
  sendAsync<Params extends BaseParams, Result>(
    opts: Partial<SendAsyncPayload<Params>> &
      Pick<SendAsyncPayload<Params>, 'method'>,
    callback: SendAsyncCallback<Result>,
  ) {
    const payload = createPayload(opts);
    this.currentProvider.sendAsync<Params, Result>(
      payload,
      (error, response) => {
        let improvedError = error;
        if (!error && response.error) {
          improvedError = new Error(
            `EthQuery - RPC Error - ${response.error.message}`,
          );
        }
        if (improvedError) {
          return callback(improvedError, undefined);
        }
        if (response.result) {
          return callback(null, response.result);
        }
        throw new Error(
          'The callback to sendAsync received no error or response',
        );
      },
    );
  }
}
