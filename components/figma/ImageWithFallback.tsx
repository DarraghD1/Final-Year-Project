import React, { useState } from 'react';
import { Image, ImageProps, StyleSheet, View } from 'react-native';

// Using a local fallback image instead of base64
const ERROR_IMAGE = require('../../assets/images/icon.png');

const styles = StyleSheet.create({
  errorContainer: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackImage: {
    width: '50%',
    height: '50%',
    resizeMode: 'contain',
  },
});

type ImageWithFallbackProps = Omit<ImageProps, 'source'> & {
  source: { uri: string } | number;
};

export function ImageWithFallback({ source, style, ...rest }: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);

  const handleError = () => {
    setDidError(true);
  };

const styles = StyleSheet.create({
  errorContainer: {
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackImage: {
    width: '50%',
    height: '50%',
    resizeMode: 'contain',
  },
});  

  if (didError) {
    return (
      <View style={[styles.errorContainer, style]}>
        <Image 
          source={ERROR_IMAGE}
          style={styles.fallbackImage}
          {...rest}
        />
      </View>
  );
}

return (
    <Image
      source={source}
      style={style}
      {...rest}
      onError={handleError}
    />
  )
}