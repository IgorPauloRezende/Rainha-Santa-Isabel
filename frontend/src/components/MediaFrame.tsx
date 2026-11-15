import { useState, type RefObject } from 'react';
import { Church } from 'lucide-react';
import { CHURCH_MEDIA } from '../lib/media';
import type { MediaKey } from '../types/church';

interface MediaFrameProps {
  mediaKey: MediaKey;
  className?: string;
  imgClassName?: string;
  imgRef?: RefObject<HTMLImageElement | null>;
}

export function MediaFrame({
  mediaKey,
  className = '',
  imgClassName = '',
  imgRef,
}: MediaFrameProps) {
  const [failed, setFailed] = useState(false);
  const asset = CHURCH_MEDIA[mediaKey] || CHURCH_MEDIA.hero_sanctuary;

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 text-neutral-500 ${className}`}
      >
        <Church className="w-8 h-8 mb-2 opacity-60" strokeWidth={1.5} />
        <span className="text-xs font-medium tracking-tight">{asset.label}</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-neutral-100 dark:bg-neutral-900 ${className}`}>
      <img
        ref={imgRef}
        src={asset.src}
        alt={asset.alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`w-full h-full object-cover ${imgClassName}`}
      />
      {asset.isIllustrative && (
        <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/65 backdrop-blur-xs px-2 py-0.5 text-[11px] font-medium text-white">
          Imagem ilustrativa
        </span>
      )}
    </div>
  );
}
