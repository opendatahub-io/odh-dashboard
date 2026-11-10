/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

import { ApiErrorEnvelope, ApiUserEnvelope } from './data-contracts';
import { HttpClient, RequestParams } from './http-client';

export class User<SecurityDataType = unknown> extends HttpClient<SecurityDataType> {
  /**
   * @description Returns the current user's settings including user ID and admin status
   *
   * @tags user
   * @name UserList
   * @summary Get user settings
   * @request GET:/user
   * @response `200` `ApiUserEnvelope` OK
   * @response `500` `ApiErrorEnvelope` Internal Server Error
   */
  userList = (params: RequestParams = {}) =>
    this.request<ApiUserEnvelope, ApiErrorEnvelope>({
      path: `/user`,
      method: 'GET',
      format: 'json',
      ...params,
    });
}
