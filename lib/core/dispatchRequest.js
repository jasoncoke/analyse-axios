'use strict';

// 发送请求函数

import transformData from './transformData.js';
import isCancel from '../cancel/isCancel.js';
import defaults from '../defaults/index.js';
import CanceledError from '../cancel/CanceledError.js';
import AxiosHeaders from '../core/AxiosHeaders.js';

/**
 * Throws a `CanceledError` if cancellation has been requested. 当请求已经发送出去，抛出一个 Cancel 类型的错误
 *
 * @param {Object} config The config that is to be used for the request
 *
 * @returns {void}
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new CanceledError();
  }
}

/**
 * Dispatch a request to the server using the configured adapter. 使用配置的适配器将请求分派到服务器
 *
 * @param {object} config The config that is to be used for the request
 *
 * @returns {Promise} The Promise to be fulfilled
 */
export default function dispatchRequest(config) {
  // 当被取消的请求已经发送出去 抛出错误
  throwIfCancellationRequested(config);

  // 获取 头信息
  config.headers = AxiosHeaders.from(config.headers);

  // Transform request data
  // 对请求数据 做处理
  config.data = transformData.call(
    config,
    config.transformRequest
  );

  // 修改 请求头的 内容类型
  if (['post', 'put', 'patch'].indexOf(config.method) !== -1) {
    config.headers.setContentType('application/x-www-form-urlencoded', false);
  }

  // 获取适配器 用户配置优先
  const adapter = config.adapter || defaults.adapter;

  //发送请求， 以promise对象返回请求结果
  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);
    // Transform response data
    response.data = transformData.call(
      config,
      config.transformResponse,
      response
    );

    response.headers = AxiosHeaders.from(response.headers);

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          config.transformResponse,
          reason.response
        );
        reason.response.headers = AxiosHeaders.from(reason.response.headers);
      }
    }

    return Promise.reject(reason);
  });
}
