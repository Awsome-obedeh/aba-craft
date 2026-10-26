import Image from 'next/image';

export default function BrandLogo({ light = false, className = '' }) {
  return <Image
    src={`/images/brand/logo-${light ? 'white' : 'dark'}.png`}
    alt="Aba Crafts"
    width={280}
    height={260}
    className={`brand-logo ${className}`}
    unoptimized
  />;
}
