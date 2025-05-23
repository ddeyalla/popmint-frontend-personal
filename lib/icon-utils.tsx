import React from 'react';
import * as LucideIcons from 'lucide-react';
import Image from 'next/image';

// Helper function to render Lucide icons dynamically
export function renderLucideIcon(iconName: string, props: any = {}) {
  // Special case for 'PopMintLogo' - render the PopMint logo image
  if (iconName === 'PopMintLogo') {
    const { className, size = 16, ...restProps } = props;
    return (
      <div className={className} style={{ width: size, height: size, position: 'relative' }} {...restProps}>
        <Image
          src="/images/popmint-logo.png"
          alt="PopMint Logo"
          layout="fill"
          objectFit="contain"
        />
      </div>
    );
  }

  // Map of all Lucide icons
  const IconComponent = (LucideIcons as any)[iconName];

  if (IconComponent) {
    return <IconComponent {...props} />;
  }

  // Fallback to MessageCircle if icon not found
  console.warn(`Icon "${iconName}" not found, using MessageCircle as fallback`);
  return <LucideIcons.MessageCircle {...props} />;
}
