'use strict';

// 构造 Axios类 脚本

import utils from './../utils.js';
import buildURL from '../helpers/buildURL.js';
import InterceptorManager from './InterceptorManager.js';
import dispatchRequest from './dispatchRequest.js';
import mergeConfig from './mergeConfig.js';
import buildFullPath from './buildFullPath.js';
import validator from '../helpers/validator.js';
import AxiosHeaders from './AxiosHeaders.js';

const validators = validator.validators;

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 *
 * @return {Axios} A new instance of Axios
 */
class Axios {
  constructor(instanceConfig) {
    // 初始化配置项,将配置对象作为 defaults 的键值
    this.defaults = instanceConfig; 
    //拦截器属性  配置请求拦截器与响应拦截器
    this.interceptors = { 
      //调用拦截器管理函数
      request: new InterceptorManager(), 
      response: new InterceptorManager()
    };
 }

  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  // 发送请求的方法 
  request(configOrUrl, config) {
    /*eslint no-param-reassign:0*/
    // Allow for axios('example/url'[, config]) a la fetch API
    // 判断第一个参数是否为 url 的字符串类型
    if (typeof configOrUrl === 'string') {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    }

    // 合并 默认配置 和 用户所传入的配置对象
    config = mergeConfig(this.defaults, config);

    // 结构赋值
    // 获取 用户传入配置中某些属性
    // transitional : ???
    // paramsSerializer: ???(参数序列化)
    // headers: 请求头
    const {transitional, paramsSerializer, headers} = config;

    if (transitional !== undefined) {
      validator.assertOptions(transitional, {
        silentJSONParsing: validators.transitional(validators.boolean),
        forcedJSONParsing: validators.transitional(validators.boolean),
        clarifyTimeoutError: validators.transitional(validators.boolean)
      }, false);
    }

    if (paramsSerializer !== undefined) {
      validator.assertOptions(paramsSerializer, {
        encode: validators.function,
        serialize: validators.function
      }, true);
    }

    // Set config.method
    // 设置请求方式
    config.method = (config.method || this.defaults.method || 'get').toLowerCase();

    // 上下文请求头
    let contextHeaders;

    // Flatten headers
    // 合并 请求头
    // 当用户配置项中含heards配置项时 执行合并操作
    contextHeaders = headers && utils.merge(
      headers.common,
      headers[config.method]
    );

    // 删除请求头多余的请求方式属性
    contextHeaders && utils.forEach(
      ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
      (method) => {
        delete headers[method];
      }
    );

    // 合并 上下文请求头 及 其用户传入的请求头配置项 并返回新数组
    config.headers = AxiosHeaders.concat(contextHeaders, headers);

    // filter out skipped interceptors 过滤掉跳过的拦截器
    // 创建请求拦截器链
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    // 将请求拦截器添加到请求拦截器链 前面 unshift
    this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
      if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
        return;
      }

      synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

      // 成功的promise在前，失败状态的在后
      requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
    });

     // 将响应拦截器添加到响应拦截器链后面  push
    const responseInterceptorChain = [];
    this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
      responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
    });

    let promise;
    let i = 0;
    let len;

    if (!synchronousRequestInterceptors) { // 同步请求拦截器
      // 一个为发送请求函数,第二个用作补位
      const chain = [dispatchRequest.bind(this), undefined];

      // 用 apply 将数组各项添加到另一个数组
      chain.unshift.apply(chain, requestInterceptorChain);
      chain.push.apply(chain, responseInterceptorChain);
      len = chain.length;

      promise = Promise.resolve(config);

      // 开始执行 chain数组中的函数
      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }

      return promise;
    }

    len = requestInterceptorChain.length;

    let newConfig = config;

    i = 0;

    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++]; // 请求拦截成功状态
      const onRejected = requestInterceptorChain[i++]; // 请求拦截失败状态
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }

    try {
      promise = dispatchRequest.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }

    i = 0;
    len = responseInterceptorChain.length;

    while (i < len) {
      promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
    }

    return promise;
  }

  getUri(config) {
    config = mergeConfig(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
}

// Provide aliases for supported request methods
// 在Axios 原型对象上添加post，get....等方法
// 实例化对象时可直接调用 .post()......
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(mergeConfig(config || {}, {
      method,
      url,
      data: (config || {}).data
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request(mergeConfig(config || {}, {
        method,
        headers: isForm ? {
          'Content-Type': 'multipart/form-data'
        } : {},
        url,
        data
      }));
    };
  }

  Axios.prototype[method] = generateHTTPMethod();

  Axios.prototype[method + 'Form'] = generateHTTPMethod(true);
});

export default Axios;
