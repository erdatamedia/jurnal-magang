const BASE_URL = typeof window !== 'undefined'
  ? (window.location.origin.includes('localhost') ? 'http://localhost:5005/api' : '/api')
  : 'http://localhost:5005/api';

interface RequestOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

async function request(endpoint: string, options: RequestOptions = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const headers: Record<string, string> = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If the body is an object and not FormData, convert to JSON and set content-type
  let body = options.body;
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    body = JSON.stringify(body);
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: (endpoint: string, headers?: Record<string, string>) => 
    request(endpoint, { method: 'GET', headers }),
  
  post: (endpoint: string, body?: any, headers?: Record<string, string>) => 
    request(endpoint, { method: 'POST', body, headers }),
  
  put: (endpoint: string, body?: any, headers?: Record<string, string>) => 
    request(endpoint, { method: 'PUT', body, headers }),
};
