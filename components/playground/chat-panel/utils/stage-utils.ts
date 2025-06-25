import { AdGenerationStage } from "@/store/chatStore";

// Track step start times for better timing
export const stepStartTimes = new Map<string, { stage: string; startTime: Date }>();

/**
 * Maps backend SSE stages to our AdGenerationStage
 */
export const mapBackendStage = (backendStage: string): AdGenerationStage => {
  switch (backendStage) {
    case 'plan':
      return 'planning';
    case 'page_scrape_started':
    case 'page_scrape_done':
      return 'scraping';
    case 'image_extraction_started':
    case 'image_extraction_done':
      return 'scraping';
    case 'research_started':
    case 'research_done':
      return 'researching';
    case 'concepts_started':
    case 'concepts_done':
      return 'concepting';
    case 'ideas_started':
    case 'ideas_done':
      return 'ideating';
    case 'images_started':
    case 'image_generation_progress':
    case 'images_done':
      return 'imaging';
    case 'done':
      return 'completed';
    case 'error':
      return 'error';
    default:
      return 'thinking';
  }
};

/**
 * Gets display names for stages
 */
export const getStageDisplayName = (stage: string): string => {
  switch (stage) {
    case 'page_scrape_done':
      return 'Product details extracted';
    case 'research_done':
      return 'Research completed';
    case 'concepts_done':
      return 'Ad concepts generated';
    case 'ideas_done':
      return 'Ad ideas generated';
    case 'images_done':
      return 'Ads generated';
    default:
      return stage.replace('_done', '').replace('_', ' ');
  }
};

/**
 * Extracts a URL from input text
 */
export const extractUrlFromInput = (inputValue: string): string | null => {
  const urlMatch = inputValue.match(/(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi);
  if (urlMatch && urlMatch.length > 0) {
    let url = urlMatch[0];
    if (url.startsWith('www.')) {
      url = `https://${url}`;
    }
    return url;
  }
  return null;
};

/**
 * Checks if input contains a valid URL
 */
export const hasValidUrl = (inputValue: string): boolean => {
  const urlMatch = inputValue.match(/(https?:\/\/|www\.)[^\s\n\r]+[^\s\n\r\.\,\!\?\;\:\)\]\}\'\"]/gi);
  return !!urlMatch && urlMatch.length > 0;
};
