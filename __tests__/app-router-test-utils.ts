// __tests__/app-router-test-utils.ts
// Test utilities for App Router API routes (NextRequest/NextResponse)

import { NextRequest, NextResponse } from 'next/server';

export interface MockNextRequestOptions {
  method?: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

export function createMockNextRequest(options: MockNextRequestOptions = {}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body,
    headers = {},
    params = {},
  } = options;

  // Create headers with proper structure
  const headersObj = new Headers();
  Object.entries(headers).forEach(([key, value]) => {
    headersObj.set(key, value);
  });

  const requestInit: RequestInit = {
    method,
    headers: headersObj,
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
    if (!headersObj.has('content-type')) {
      headersObj.set('content-type', 'application/json');
    }
  }

  const request = new NextRequest(url, requestInit);

  // Add params to request (App Router uses params in route handlers)
  (request as any).params = params;

  return request;
}

export function createMockNextResponse(): {
  response: NextResponse;
  json: jest.Mock;
  status: jest.Mock;
  headers: Headers;
} {
  const json = jest.fn();
  const status = jest.fn((code: number) => ({
    json,
    status: code,
  }));

  const response = NextResponse.json({});
  
  // Override json method
  (response as any).json = json;
  (response as any).status = status;

  return {
    response,
    json,
    status,
    headers: response.headers,
  };
}

export function getResponseData(response: NextResponse): any {
  // For App Router, we need to read the response body
  // In tests, we'll use the json mock instead
  return null;
}
