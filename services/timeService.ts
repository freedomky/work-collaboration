
/**
 * Service to obtain the current time via network request.
 * This helps prevent issues where the user's local device time is incorrect.
 */
export const getNetworkTime = async (): Promise<Date> => {
  try {
    // Perform a HEAD request to the current location. 
    // Appending a timestamp query param to prevent caching of the headers.
    const response = await fetch(window.location.href + '?t=' + Date.now(), { 
      method: 'HEAD',
      cache: 'no-store'
    });
    
    const dateHeader = response.headers.get('Date');
    
    if (dateHeader) {
      return new Date(dateHeader);
    } else {
      console.warn("Date header missing, falling back to local time.");
      return new Date();
    }
  } catch (error) {
    console.error("Failed to fetch network time, falling back to local time:", error);
    return new Date();
  }
};

/**
 * Helper to get a Date object representing the start of the day (00:00:00) 
 * for the given date in China Standard Time (Asia/Shanghai).
 */
export const getStartOfDayInChina = (date: Date): Date => {
  // Create a formatter for China time
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '1970');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1');
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');

  // Construct a new date. Note: new Date(y, m-1, d) uses local browser time.
  // To strictly adhere to "System is China Time", we treat the extracted y/m/d as local
  // or construct it specifically. For simpler calculation of "days difference",
  // we can just normalize the time component to 0 using the values.
  const chinaDate = new Date(year, month - 1, day);
  chinaDate.setHours(0, 0, 0, 0);
  return chinaDate;
};
