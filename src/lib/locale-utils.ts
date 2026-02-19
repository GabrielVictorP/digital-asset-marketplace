// Utility functions for locale-based formatting

/**
 * Get user's locale from navigator or fallback to pt-BR
 * Force pt-BR for this application as it's primarily Brazilian
 */
export const getUserLocale = (): string => {
  // Always return pt-BR for this Brazilian application
  return 'pt-BR';
};

/**
 * Get user's timezone from Intl API or fallback to UTC
 */
export const getUserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
};

/**
 * Format date according to user's locale
 */
export const formatDateForUser = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = getUserLocale();
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  return dateObj.toLocaleDateString(locale, defaultOptions);
};

/**
 * Format date and time according to user's locale
 */
export const formatDateTimeForUser = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = getUserLocale();
  const timezone = getUserTimezone();
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    ...options
  };
  
  return dateObj.toLocaleDateString(locale, defaultOptions);
};

/**
 * Format currency according to user's locale
 * Default to BRL (Brazilian Real) but can be overridden
 */
export const formatCurrencyForUser = (amount: number, currency = 'BRL'): string => {
  const locale = getUserLocale();
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  } catch {
    // Fallback to BRL formatting if user's locale doesn't support the currency
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  }
};

/**
 * Get user's preferred language for text content
 * Force Portuguese for this Brazilian application
 */
export const getUserLanguage = (): 'pt' | 'en' | 'es' | 'other' => {
  // Always return Portuguese for this Brazilian application
  return 'pt';
};
