import React from 'react';
import { CloudinaryAdapter } from '../services/cloudinary';

interface BackgroundLayersProps {
  bgImage?: string;
  bgPosition?: string;
  isClearBg: boolean;
}

export const BackgroundLayers: React.FC<BackgroundLayersProps> = ({
  bgImage,
  bgPosition = '60% 35%',
  isClearBg,
}) => {
  const hasBg = Boolean(bgImage && bgImage.trim());
  const crispUrl = hasBg ? CloudinaryAdapter.getOptimizedUrl(bgImage!, 'f_auto,q_auto:best,w_2560') : '';
  const blurredUrl = hasBg ? CloudinaryAdapter.getOptimizedUrl(bgImage!, 'f_auto,q_auto,w_480') : '';

  return (
    <div
      className={`bg-stage-wrap ${isClearBg ? 'is-clear' : ''}`}
      id="bgStageWrap"
      style={{
        ['--bg-focal-pos' as any]: bgPosition,
      }}
    >
      {/* Lớp dưới: rõ nét */}
      <div
        className={`bg-layer bg-layer-clear ${hasBg ? '' : 'no-custom-bg'}`}
        id="bgLayerClear"
        style={hasBg ? { backgroundImage: `url("${crispUrl}")` } : undefined}
      />

      {/* Lớp trên: mờ + gradient mask */}
      <div
        className={`bg-layer bg-layer-blur ${hasBg ? '' : 'no-custom-bg'}`}
        id="bgLayerBlur"
        style={hasBg ? { backgroundImage: `url("${blurredUrl}")` } : undefined}
      />

      {/* Ba lớp shade chuẩn đặc tả Riverine & lớp vignette bảo vệ độ tương phản */}
      <div className="shade-layer shade-h" />
      <div className="shade-layer shade-v" />
      <div className="shade-layer shade-radial" />
      <div className="shade-layer shade-vignette" />
    </div>
  );
};
