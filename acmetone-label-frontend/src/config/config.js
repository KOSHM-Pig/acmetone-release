const isDev = true;

export const mainBackend_API_URL = isDev ? 'http://localhost:3000/api' : 'https://api.acmetone.com/api';
export const labelBackend_API_URL = isDev ? 'http://localhost:3001/api' : 'https://label-api.acmetone.com/api';
export const mainBackend_STATIC_URL = isDev ? 'http://localhost:3000' : 'https://api.acmetone.com';
export const labelBackend_STATIC_URL = isDev ? 'http://localhost:3001' : 'https://label-api.acmetone.com';


