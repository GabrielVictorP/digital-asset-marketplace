/**
 * Security configuration for network monitoring and log sanitization.
 * Defines PII masking rules for client-side telemetry.
 */

const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

export const SECURITY_CONFIG = {
  // Global security toggle
  ENABLED: isProduction || import.meta.env.VITE_ENABLE_NETWORK_SECURITY === 'true',
  
  // PII Masking Settings
  HIDE_SENSITIVE_DATA: isProduction || import.meta.env.VITE_HIDE_SENSITIVE_DATA === 'true',
  ENCRYPT_TOKENS: isProduction || import.meta.env.VITE_ENCRYPT_TOKENS === 'true',
  
  // Environment
  IS_DEVELOPMENT: isDevelopment,
  IS_PRODUCTION: isProduction,
  SECURITY_LEVEL: isProduction ? 'PRODUCTION' : 'DEVELOPMENT',
  
  // Fields to sanitize in logs/monitoring
  ALWAYS_HIDE: [
    'access_token',
    'refresh_token',
    'password',
    'token'
  ],
  
  PARTIAL_MASK: [
    'email',
    'phone',
    'cpf',
    'pix_key'
  ],
  
  OBFUSCATE: [
    'user_id',
    'session_id'
  ]
};