'use strict';

import utils from './utils.js';
import bind from './helpers/bind.js';
import Axios from './core/Axios.js';
import mergeConfig from './core/mergeConfig.js';
import defaults from './defaults/index.js';
import formDataToJSON from './helpers/formDataToJSON.js';
import CanceledError from './cancel/CanceledError.js';
import CancelToken from './cancel/CancelToken.js';
import isCancel from './cancel/isCancel.js';
import {VERSION} from './env/data.js';
import toFormData from './helpers/toFormData.js';
import AxiosError from './core/AxiosError.js';
import spread from './helpers/spread.js';
import isAxiosError from './helpers/isAxiosError.js';
import AxiosHeaders from "./core/AxiosHeaders.js";

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 *
 * @returns {Axios} A new instance of Axios
 */
// 创建Axois 实例对象
function createInstance(defaultConfig) {
  // 创建一个Axios实例对象并传入默认配置
  const context = new Axios(defaultConfig);
  // 创建instance函数方法，并将 Axios.prototype.request中的this指向  context
  const instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  // instance 继承 Axios.prototype 原型身上的属性与方法 并 将instance函数中this指向context
  // allOwnKeys: true 表示深层继承,沿着原型链继承
  utils.extend(instance, Axios.prototype, context, {allOwnKeys: true});

  // Copy context to instance
  // 将Axios实例对象身上的方法和属性 复制到 instance身上
  utils.extend(instance, context, null, {allOwnKeys: true});

  // Factory for creating new instances
  // 添加 create 方法
  // 作用： 合并默认配置 和 用户配置 并返回创建实例对象instance 函数方法
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  return instance;
}

// Create the default instance to be exported
// 创建默认配置的导出对象 axios
const axios = createInstance(defaults);

// 58 - 88 均为继承方法

// Expose Axios class to allow class inheritance
axios.Axios = Axios;

// Expose Cancel & CancelToken
axios.CanceledError = CanceledError;
axios.CancelToken = CancelToken;
axios.isCancel = isCancel;
axios.VERSION = VERSION;
axios.toFormData = toFormData;

// Expose AxiosError class
axios.AxiosError = AxiosError;

// alias for CanceledError for backward compatibility
axios.Cancel = axios.CanceledError;

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};

axios.spread = spread;

// Expose isAxiosError
axios.isAxiosError = isAxiosError;

axios.AxiosHeaders = AxiosHeaders;

axios.formToJSON = thing => formDataToJSON(utils.isHTMLForm(thing) ? new FormData(thing) : thing);

axios.default = axios;

// this module should only have a default export
export default axios
