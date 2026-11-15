import parishLogo from '../assets/images/logo_igreja.svg';

interface ParishEmblemProps {
  alt: string;
  className?: string;
}

export function ParishEmblem({ alt, className = '' }: ParishEmblemProps) {
  return (
    <img
      src={parishLogo}
      alt={alt}
      className={className}
      decoding="async"
    />
  );
}
