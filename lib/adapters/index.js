import utils from '../utils.js';
import httpAdapter from './http.js';
import xhrAdapter from './xhr.js';

const adapters = {
  http: httpAdapter,
  xhr: xhrAdapter
}

// adapters/ 下的模块是在收到响应后处理调度请求和解决返回的 Promise 的模块。

export default {
  getAdapter: (nameOrAdapter) => {
    if(utils.isString(nameOrAdapter)){
      const adapter = adapters[nameOrAdapter];

      if (!nameOrAdapter) {
        throw Error(
          utils.hasOwnProp(nameOrAdapter) ?
            `Adapter '${nameOrAdapter}' is not available in the build` :
            `Can not resolve adapter '${nameOrAdapter}'`
        );
      }

      return adapter
    }

    if (!utils.isFunction(nameOrAdapter)) {
      throw new TypeError('adapter is not a function');
    }

    return nameOrAdapter;
  },
  adapters
}
