import { useState, useEffect } from 'react';

/**
 * Custom hook for detecting valid URLs in input text
 * @param inputValue The current input value to check for URLs
 * @returns Object containing whether a valid URL was detected
 */
export function useUrlDetection(inputValue: string) {
  const [hasValidUrl, setHasValidUrl] = useState(false);

  // Check for valid URL in input
  useEffect(() => {
    const urlMatch = inputValue.match(/(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi);
    setHasValidUrl(!!urlMatch && urlMatch.length > 0);
  }, [inputValue]);

  /**
   * Extract URL from content
   * @param content Text content to extract URL from
   * @returns The extracted URL or undefined if none found
   */
  const extractUrl = (content: string): string | undefined => {
    const urlMatch = content.match(/(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi);
    if (urlMatch && urlMatch.length > 0) {
      let url = urlMatch[0];
      if (url.startsWith('www.')) {
        url = `https://${url}`;
      }
      return url;
    }
    return undefined;
  };

  return {
    hasValidUrl,
    extractUrl
  };
}
