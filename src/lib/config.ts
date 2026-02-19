// Environment configuration with fallbacks for production builds
import logger from './logger';
export const config = {
    // Supabase Configuration
    supabase: {
        url: import.meta.env.VITE_SUPABASE_URL,
        anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
  },

    // App Configuration
    app: {
        name: import.meta.env.VITE_APP_NAME,
        whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER 
    },

    // Admin Configuration
    admin: {
        emails: [
            import.meta.env.VITE_ADMIN_EMAIL,
            import.meta.env.VITE_ADMIN_EMAIL_SUPORT
        ].filter(Boolean)
    },

    // Development mode check
    isDev: import.meta.env.DEV,

    // Environment validation
    isConfigured: () => {
        if (config.isDev) {
            // In development, require actual environment variables
            return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
        }
        // In production, use fallbacks
        return true;
    }
};

// Helper function to safely get config values
export const getConfig = () => {
    if (!config.isConfigured() && config.isDev) {
        logger.warn('Environment variables not properly configured. Please check your .env file.');
    }
    return config;
};
