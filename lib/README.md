# Axios源码分析****

axios GitHub地址：[axios/axios: Promise based HTTP client for the browser and node.js (github.com)](https://github.com/axios/axios#axios-api)

根据原文档及个人理解集成Axios源码分析笔记

src中存放debug所用到的html文档

## 原文档中陈诉的Axios特点

从浏览中创建XHR对象(Make XMLHttpRequests from the browser)
在 node.js 中创建http请求(Make http requests from node.js)
提供 Promise Api(Supports the Promise API）
请求拦截与响应拦截(Intercept request and response)
转换请求数据与响应数据(Transform request and response data)
取消请求(Cancel requests)
自动转换json格式数据(Automatic transforms for JSON data)
自动将数据对象序列化为多部分/form-data和x-www-form-urlencoded体编码（Automatic data object serialization to multipart/form-data and x-www-form-urlencoded body encodings）
保护XSRF的客户端支持（Client side support for protecting against XSRF）

## Axios整体结构与思维

### 目录结构

#### /dist/

打包文件

#### /lib/

源码文件

|------------ /adapters/	#定义适配器

|               |----- http.js	#实现http适配器

|			   |------ xhr.js	#实现xhr适配器，即封装xhr对象

|------------ /cancel/	#实现请求取消功能

|------------ /core/	#定义核心内容

|			   |------ Axios.js	#axios 核心类

|			   |------ dispatchRequest.js # 调用 http 请求适配器方法发送请求的函数

|			   |------ InterceptorManager.js	#实现拦截器管理

|			   |......

|------------ axios.js/	# 对外暴露接口

|......

## 源码注释

列出目前含注释的源码文件

axios.js

/core/Axios.js

/core/dispatchRequest.js

/core/InterceptorManager.js

/core/mergeConfig.js

## axios.create()

首先创建调用axios.create()函数，并在此设置断点

当执行至断电位置时，利用debug，发现程序随后跳转到 lib/axios.js 中的 createInstance 函数

```javascript
const $axios = axios.create({
    baseURL: 'http://jsonplaceholder.typicode.com',
    timeout: 2000
});
```

进入createInstance函数：

```javascript
function createInstance(defaultConfig) {
  const context = new Axios(defaultConfig); //创建Axios实例对象 context
  //创建 instance 函数方法，可直接调用
  //分析bind函数：返回一个函数 并绑定 this 到 context 身上
  const instance = bind(Axios.prototype.request, context); 

  // Copy axios.prototype to instance
  // 在 instance 函数方法上添加Axios.prototype方法与其原型属性，至此instance身上Axios类的属性与方法
  utils.extend(instance, Axios.prototype, context, {allOwnKeys: true});

  // Copy context to instance
  // 在 instance 函数方法上添加context实例对象方法与其原型属性，至此instance身上就多了很多原型方法
  utils.extend(instance, context, null, {allOwnKeys: true});

  // Factory for creating new instances
  instance.create = function create(instanceConfig) {
    // 合并默认配置项和用户配置项
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  return instance;
}
```

### bind() 函数的作用

函数有两个形参，第一个为函数，第二个为this所要指向的对象
返回值是一个函数，内容与第一个形参一致，但改变了在fn函数中所调用的this指向

```javascript
export default function bind(fn, thisArg) {
  return function wrap() {
    return fn.apply(thisArg, arguments);
  };
}
```

[^该函数摘至  /helpers/bind.js]: 

###  utils.extend() 函数分析

a继承b身上的方法

第四个参数默认为undefined

```javascript
const extend = (a, b, thisArg, {allOwnKeys}= {}) => {
  forEach(b, (val, key) => {
    if (thisArg && isFunction(val)) {
      // 如果 thisArg 存在且 b 身上的对象属性值为函数时
      // 继承对象方法时修改 this 指向至 thisArg
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  }, {allOwnKeys});
  return a;
}
```



### forEach()  方法分析

函数接受3个参数

第一个形参为 object | array ,表示需要遍历的对象或数据

第二个形参为 function ，每一个遍历项的回调函数

第三个形参为 boolean，表示是否遍历其原型对象

```javascript
function forEach(obj, fn, {allOwnKeys = false} = {}) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  let i;
  let l;

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    //如果 allOwnKeys 为true，获取包含原型对象上的属性名
    const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
    const len = keys.length;
    let key;

    for (i = 0; i < len; i++) {
      key = keys[i];
      fn.call(null, obj[key], key, obj);
    }
  }
}
```



## Axios.js  创建Axios构造函数

### Axios 类

```javascript
class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig; //初始化配置项
    this.interceptors = { //拦截器属性  配置请求拦截器与响应拦截器
      request: new InterceptorManager(), //调用拦截器管理函数
      response: new InterceptorManager()
    };
 }
......
```

# Qutions

收集在分析源码过程中不懂存疑的函数,变量......

## utils.js

### merge函数中的 caseless 指？

