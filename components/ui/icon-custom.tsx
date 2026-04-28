import React from 'react';
import { Image, ImageProps } from 'react-native';

type IconName = 'pm-star' | 'pm-badge' | 'pm-laurel' | 'pm-book';

interface IconCustomProps extends Omit<ImageProps, 'source'> {
  name: IconName;
  size?: number;
  color?: string;
}

const ICON_URLS: Record<IconName, string> = {
  'pm-star': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663538599756/Aw9xoMMFEdGZdNpGTgZpJA/pm-star_d7966c97.png',
  'pm-badge': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663538599756/Aw9xoMMFEdGZdNpGTgZpJA/pm-badge_4352199d.png',
  'pm-laurel': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663538599756/Aw9xoMMFEdGZdNpGTgZpJA/pm-laurel_5894b7e3.png',
  'pm-book': 'https://d2xsxph8kpxj0f.cloudfront.net/310519663538599756/Aw9xoMMFEdGZdNpGTgZpJA/pm-book_ec5858c8.png',
};

/**
 * Custom icon component for PM-SP themed icons.
 * Renders military police icons (star, badge, laurel, book).
 */
export function IconCustom({
  name,
  size = 24,
  style,
  ...props
}: IconCustomProps) {
  return (
    <Image
      source={{ uri: ICON_URLS[name] }}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
      {...props}
    />
  );
}
