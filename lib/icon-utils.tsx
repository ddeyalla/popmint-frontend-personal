import React from 'react';
import * as LucideIcons from 'lucide-react';

// Helper function to render Lucide icons dynamically
export function renderLucideIcon(iconName: string, props: any = {}) {
  // Map of all Lucide icons
  const IconComponent = (LucideIcons as any)[iconName];
  
  if (IconComponent) {
    return <IconComponent {...props} />;
  }
  
  // Fallback to MessageCircle if icon not found
  console.warn(`Icon "${iconName}" not found, using MessageCircle as fallback`);
  return <LucideIcons.MessageCircle {...props} />;
}
