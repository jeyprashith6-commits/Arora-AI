import React from 'react';
import { VoiceWaveVisualizer, type VoiceWaveVisualizerProps } from './VoiceWaveVisualizer';

export type CircularWaveVisualizerProps = VoiceWaveVisualizerProps;

export const CircularWaveVisualizer: React.FC<CircularWaveVisualizerProps> = (props) => {
  return <VoiceWaveVisualizer {...props} />;
};
