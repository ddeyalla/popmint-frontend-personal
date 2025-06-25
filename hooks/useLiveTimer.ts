import { useState, useEffect } from 'react';

/**
 * Live timer hook that provides real-time elapsed time formatting
 * Returns formatted time string (mm:ss) or null if no start time provided
 */
export function useLiveTimer(start: Date | null) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!start) return;

    // Calculate initial elapsed time
    const initialElapsed = Date.now() - start.getTime();
    setElapsed(initialElapsed);

    // Set up interval to update every second
    const id = setInterval(() => {
      setElapsed(Date.now() - start.getTime());
    }, 1000);

    return () => clearInterval(id);
  }, [start]);

  // Return formatted time string or null
  if (!start) return null;
  
  // Convert milliseconds to seconds
  const totalSeconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  // Format as mm:ss
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Hook for displaying completion time with checkmark
 * Returns formatted completion string like "✅ 14s"
 */
export function useCompletionTimer(startTime: Date | null, endTime: Date | null) {
  if (!startTime || !endTime) return null;
  
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  return `✅ ${duration}s`;
}
