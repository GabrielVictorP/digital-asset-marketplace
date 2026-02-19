/**
 * Network interceptor to hide sensitive data in production builds
 */

import { SECURITY_CONFIG, getSecurityStatus } from './security-config';

// Extend XMLHttpRequest type to include _url property
declare global {
  interface XMLHttpRequest {
    _url?: string;
  }
}

// Use security configuration
const isDevelopment = SECURITY_CONFIG.IS_DEVELOPMENT;
const shouldIntercept = SECURITY_CONFIG.ENABLED;
const shouldHideSensitiveData = SECURITY_CONFIG.HIDE_SENSITIVE_DATA;
const shouldEncryptTokens = SECURITY_CONFIG.ENCRYPT_TOKENS;

// List of sensitive endpoints to intercept (Supabase specific)
const SENSITIVE_ENDPOINTS = [
  '/auth/v1/token',
  '/auth/v1/user',
  '/auth/v1/signup',
  '/auth/v1/recover',
  '/auth/v1/verify',
  '/auth/v1/refresh',
  '/rest/v1/items',
  '/functions/v1/send-login-notification'
];

// Sensitive fields to mask in responses and requests
const SENSITIVE_RESPONSE_FIELDS = [
  'access_token',
  'refresh_token',
  'jwt',
  'password',
  'email',
  'phone',
  'user_metadata',
  'app_metadata',
  'identities',
  'purchased_value',
  'rl_price',
  'parcelado_price',
  'kks_price',
  'id', // User ID
  'sub', // JWT subject
  'aud', // JWT audience
  'role',
  'session_id',
  'confirmation_sent_at',
  'confirmed_at',
  'last_sign_in_at',
  'created_at',
  'updated_at',
  'user_id',
  'identity_id',
  'identity_data',
  'provider',
  'providers'
];

const SENSITIVE_REQUEST_FIELDS = [
  'password',
  'email',
  'phone'
];

// Completely hide these endpoints in production
const BLOCKED_ENDPOINTS_PROD = [
  '/auth/v1/token',
  '/auth/v1/user'
];

const maskSensitiveData = (data: any, isRequest = false): any => {
  if (!shouldHideSensitiveData && isDevelopment) {
    return data; // Allow full data in development if security is disabled
  }

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item, isRequest));
  }

  const masked = { ...data };
  const fieldsToMask = isRequest ? SENSITIVE_REQUEST_FIELDS : SENSITIVE_RESPONSE_FIELDS;
  
  for (const field of fieldsToMask) {
    if (masked.hasOwnProperty(field)) {
      if (typeof masked[field] === 'string') {
        if (field === 'email') {
          // More aggressive email masking
          if (shouldHideSensitiveData) {
            masked[field] = isDevelopment ? 'user@*****.com' : '***@***.***';
          }
        } else if (field.includes('token') || field === 'jwt') {
          // Use obfuscation function for tokens
          masked[field] = obfuscateToken(masked[field]);
        } else if (field === 'id' || field.includes('_id')) {
          // Hide all IDs
          if (shouldHideSensitiveData) {
            masked[field] = isDevelopment ? 'dev-***-id' : '***';
          }
        } else if (field.includes('_at')) {
          // Hide timestamps
          if (shouldHideSensitiveData) {
            masked[field] = isDevelopment ? '2025-**-**T**:**:**' : 'HIDDEN';
          }
        } else {
          // Generic aggressive masking
          if (shouldHideSensitiveData) {
            masked[field] = isDevelopment ? `***${field.toUpperCase()}***` : '***';
          }
        }
      } else if (typeof masked[field] === 'number') {
        if (shouldHideSensitiveData) {
          masked[field] = isDevelopment ? -1 : 0;
        }
      } else if (typeof masked[field] === 'object') {
        masked[field] = maskSensitiveData(masked[field], isRequest);
      } else if (typeof masked[field] === 'boolean') {
        if (shouldHideSensitiveData && !isDevelopment) {
          masked[field] = false;
        }
      }
    }
  }

  // In production, remove entire sensitive objects
  if (shouldHideSensitiveData && !isDevelopment) {
    if (masked.user_metadata) masked.user_metadata = { message: 'HIDDEN' };
    if (masked.app_metadata) masked.app_metadata = { message: 'HIDDEN' };
    if (masked.identities) masked.identities = [{ message: 'HIDDEN' }];
  }

  return masked;
};

const isSensitiveEndpoint = (url: string): boolean => {
  return SENSITIVE_ENDPOINTS.some(endpoint => url.includes(endpoint));
};

// Simple encryption/obfuscation for tokens
const obfuscateToken = (token: string): string => {
  if (!shouldEncryptTokens) return '***TOKEN_HIDDEN***';
  
  // Simple obfuscation - in production you'd use proper encryption
  const start = token.substring(0, 4);
  const end = token.substring(token.length - 4);
  const middle = '*'.repeat(Math.min(token.length - 8, 20));
  
  return isDevelopment ? `${start}${middle}${end}` : '***ENCRYPTED***';
};

export const initNetworkInterceptor = () => {
  if (!shouldIntercept) {
    console.warn('🚨 Network interceptor is DISABLED - sensitive data may be exposed!');
    return;
  }

  const environmentLabel = isDevelopment ? '🔧 DEV' : '🔒 PROD';
  console.warn(`%c${environmentLabel} NETWORK INTERCEPTOR ACTIVE`, 
    'background: red; color: white; font-weight: bold; padding: 4px 8px; border-radius: 4px;');

  // Intercept fetch requests with more aggressive approach
  const originalFetch = window.fetch;
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    try {
      // Get URL first
      let url: string;
      if (typeof args[0] === 'string') {
        url = args[0];
      } else if (args[0] instanceof Request) {
        url = args[0].url;
      } else if (args[0] instanceof URL) {
        url = args[0].toString();
      } else {
        url = '';
      }

      console.log(`${environmentLabel} 🌐 Intercepting request to:`, url);

      // Check if this is a sensitive endpoint
      const isSensitive = isSensitiveEndpoint(url);
      
      if (isSensitive) {
        console.log(`${environmentLabel} 🚨 SENSITIVE ENDPOINT DETECTED:`, url);
        
        // Mask request body if it contains sensitive data
        if (args[1]?.body) {
          try {
            const originalBody = args[1].body;
            if (typeof originalBody === 'string') {
              const bodyData = JSON.parse(originalBody);
              const maskedBody = maskSensitiveData(bodyData, true);
              console.log(`${environmentLabel} 📤 MASKED REQUEST:`, maskedBody);
            }
          } catch (e) {
            console.log(`${environmentLabel} 📤 Request body (non-JSON)`);
          }
        }
      }

      // Make the actual request
      const response = await originalFetch(...args);
      
      if (isSensitive) {
        // In production, completely block certain endpoints from being visible
        if (!isDevelopment && BLOCKED_ENDPOINTS_PROD.some(endpoint => url.includes(endpoint))) {
          console.log(`${environmentLabel} 🚫 COMPLETELY BLOCKING ENDPOINT:`, url);
          
          // Return a fake successful response
          const blockedResponse = new Response(JSON.stringify({ 
            message: '🔒 This endpoint has been blocked for security',
            blocked_at: new Date().toISOString(),
            environment: 'PRODUCTION'
          }), {
            status: 200,
            statusText: 'Blocked for Security',
            headers: new Headers({ 
              'Content-Type': 'application/json',
              'X-Security-Block': 'true'
            })
          });
          
          return blockedResponse;
        }

        // For other sensitive endpoints, mask the response
        const clonedResponse = response.clone();
        
        try {
          const originalData = await clonedResponse.json();
          const maskedData = maskSensitiveData(originalData, false);
          
          console.log(`${environmentLabel} 📥 MASKED RESPONSE:`, maskedData);
          
          // Return the masked response
          const maskedResponse = new Response(JSON.stringify(maskedData), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
          
          return maskedResponse;
        } catch (error) {
          console.log(`${environmentLabel} ⚠️ Could not parse response as JSON, returning original`);
          return response;
        }
      }
      
      return response;
    } catch (error) {
      console.error('🚨 Network interceptor error:', error);
      return originalFetch(...args);
    }
  };

  // Intercept XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
    this._url = url.toString();
    return originalOpen.call(this, method, url, ...args);
  };
  
  XMLHttpRequest.prototype.send = function(body?: any) {
    if (isSensitiveEndpoint(this._url)) {
      const originalOnReadyStateChange = this.onreadystatechange;
      
      this.onreadystatechange = function() {
        if (this.readyState === 4 && this.responseText) {
          try {
            const originalData = JSON.parse(this.responseText);
            const maskedData = maskSensitiveData(originalData);
            
            // Override responseText with masked data
            Object.defineProperty(this, 'responseText', {
              value: JSON.stringify(maskedData),
              writable: false
            });
          } catch (error) {
            // If response is not JSON, keep original
          }
        }
        
        if (originalOnReadyStateChange) {
          originalOnReadyStateChange.call(this);
        }
      };
    }
    
    return originalSend.call(this, body);
  };
};

// Auto-initialize interceptor
if (shouldIntercept) {
  console.log('🚀 Auto-initializing network interceptor...');
  initNetworkInterceptor();
  console.log('✅ Network interceptor initialized successfully');
} else {
  console.warn('⚠️ Network interceptor is DISABLED');
}
