import { cloneDeep } from 'lodash-es';

import { RequestOptions, RequestMethod, Headers } from '@angular/http';

export enum BodyParseType {
  JSON = 'applicaion/json',
  URL_ENCODED = 'application/x-www-form-urlencoded',
}

/**
 * 单独请求的参数
 */
export interface ApiArg {
  url?: string;
  method?: RequestMethod;
  headers?: Headers;
  params?: object;
  body?: any;
  transBody?: any;
}

export class ApiOptions {
  apiArg: ApiArg;
  restArgs: {};

  constructor({
    apiArg = null,
    restArgs = {}
  } = {}) {
    this.apiArg = apiArg;
    this.restArgs = restArgs;
  }
}

export class Api {
  host: string;
  prefix: string;
  version: string;
  module: string;
  // 所有API公共的params
  params: object;
  // 所有API公共的body
  body: object;
  // 所有API公共的header
  headers: Headers;
  apis: {
    [key: string]: ApiArg
  };

  // {
  //     host: http://192.168.1.1,
  //     prefix: 'api/admin',
  //     version: 'v1'
  //     module: 'user'
  // }
  // http://192.168.1.1/api/admin/v1/user
  constructor ({
    host    = location.origin,
    prefix  = '',
    version = '',
    module  = '',
    params  = {},
    body    = {},
    headers = new Headers(),
  } = {}, apis: {[key: string]: ApiArg} = {}) {
    this.host    = host;
    this.prefix  = prefix;
    this.version = version;
    this.module  = module;
    this.params  = params;
    this.body    = body;
    this.headers = headers;
    this.apis    = {};

    this.add(apis);
  }

  add(apis: {[key: string]: ApiArg}): Api {
    for (const api in apis) {
      if (!api) {
        continue;
      }
      const url = this.host
        + `/${this.prefix}/${this.version}/${this.module}/${apis[api].url || ''}`
        .replace(/\/+/g, '/')
        .replace(/\/+$/, '');

      const method = apis[api].method;

      const headers = new Headers({...(this.headers && this.headers.toJSON()), ...(apis[api].headers && apis[api].headers.toJSON())});

      const params = {...(apis[api].params || {}), ...this.params};

      const body = {...this.body, ...apis[api].body};

      const transBody = this.transBody(body, headers.get('Content-Type') as BodyParseType);

      this.apis[api] = {
        url,
        method,
        params,
        headers,
        body,
        transBody,
      };
    }

    return this;
  }

  /**
   * @desc 获取RequestOptions
   */
  get(key: string, apiArg: ApiArg = null, restArg: object = {}): RequestOptions {
    const _requestOptions: ApiArg = cloneDeep(this.apis[key]) as ApiArg;
    if (apiArg) {
      if (apiArg.headers) {
        _requestOptions.headers = new Headers({..._requestOptions.headers.toJSON(), ...apiArg.headers.toJSON()});
      }

      _requestOptions.params = {..._requestOptions.params, ...apiArg.params};

      _requestOptions.body = {
        ..._requestOptions.body,
        ...apiArg.body
      };

      _requestOptions.transBody = this.transBody(_requestOptions.body, _requestOptions.headers.get('Content-Type') as BodyParseType);
    }

    // 格式化rest风格url
    for (const arg in restArg) {
      if (!arg) {
        continue;
      }
      _requestOptions.url = _requestOptions.url.replace(`:${arg}`, restArg[arg]);
    }

    return new RequestOptions({
      method: _requestOptions.method,
      url: _requestOptions.url,
      headers: _requestOptions.headers,
      params: _requestOptions.params,
      body: _requestOptions.transBody,
    });
  }


  transBody(body: object, type: BodyParseType): string|object {
    switch (type) {
      case BodyParseType.JSON: {
        return JSON.stringify(body);
      }
      case BodyParseType.URL_ENCODED: {
        let data = '';
        for (const key in body) {
          if (!key) {
            continue;
          }
          data += `&${key}=${body[key]}`;
        }
        return data.replace(/^&/, '');
      }
      default: {
        return body;
      }
    }
  }
}
