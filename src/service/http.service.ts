import{
  isObject,
  cloneDeep,
  isEqual
}  from 'lodash-es';
import {
  Injectable
} from '@angular/core';
import {
  Http,
  Headers,
  Request,
  Response,
  RequestOptions
} from '@angular/http';


import {
  Observable
} from 'rxjs/Observable';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/catch';

export interface RequestCache {
  // 请求参数
  request: Request;
  // 缓存的数据
  data: any;
}

export interface HttpOptions {
  // 是否从缓存取数据
  isFromCache?: boolean;
  // 成功后弹出的消息，如果不设置该值则不会调用successResponse
  successMessage?: string;
}

export interface HttpServiceConfig {
  // ture => 继续执行 false => 不继续执行
  beforeFetchInterceptor?: () => boolean;
  errorResponseInterceptor?: (message: string, response: Response) => void;
  // message: HttpOptions.successMessage = null
  successResponseInterceptor?: (message: string, response: Response) => void;
}

@Injectable()
export class HttpService {
  private _cache: RequestCache[] = [];
  private _requestOptions = new RequestOptions({
    headers: new Headers({
      'Content-Type': 'application/json'
    })
  });

  constructor(
    private http: Http,
  ) {
    this.config();
  }

  private beforeFetchInterceptor: () => boolean;
  private errorResponseInterceptor: (message: string, response: Response) => void;
  private successResponseInterceptor: (message: string, response: Response) => void;

  config({
    beforeFetchInterceptor      = () => true,
    errorResponseInterceptor    = (message: string, response: Response) => {},
    successResponseInterceptor  = (message: string, response: Response) => {},
  }: HttpServiceConfig = {}) {
    this.beforeFetchInterceptor     = beforeFetchInterceptor;
    this.errorResponseInterceptor   = errorResponseInterceptor;
    this.successResponseInterceptor = successResponseInterceptor;
  }

  /**
   * @description fetch ajax数据
   */
  fetch(requestOptions: RequestOptions, { isFromCache = false, successMessage = null}: HttpOptions = {}): Observable<any> {
    if (!this.beforeFetchInterceptor()) {
      throw Observable.of(false);
    }

    const _requestOptions = this._requestOptions.merge(requestOptions);
    const _request = new Request(_requestOptions);

    // 获取缓存数据
    const cache = this._cache.filter(v => _isEqual(v.request, _request));
    if (isFromCache && cache.length > 0) {
      return Observable.of(cache);
    }

    return this.http.request(_request).switchMap((response: Response) => {
      let result;

      if (response.ok && (response.status >= 200 && response.status < 300)) {
        try {
          const body = response.json();
          if (!_isObject(body) || body.code !== 0) {
            throw response;
          } else {
            this.successResponseInterceptor(successMessage, response);
          }
          this._cache.push({
            request: _request,
            data: _cloneDeep(body),
          });
          result = body;
        } catch (e) {
          throw response;
        }
      } else {
        throw response;
      }

      return Observable.of(result);
    })
    .catch((response: Response) => {
      let message = '';
      if (response.status === 400) {
        message = '请求出错！';
      } else if (response.status === 401) {
        message = '登陆已过期，请重新登陆！';
      } else if (response.status === 403) {
        message = '当前没有操作权限！';
      } else if (response.status === 404) {
        message = 'API地址无效！';
      } else {
        try {
          const body = response.json();
          message = body.message || '服务器开小差啦，请稍后再试!';
        } catch (e) {
          message = e || '服务器开小差啦，请稍后再试!';
        }
      }

      this.errorResponseInterceptor(message, response);

      throw response;
    });
  }
}
