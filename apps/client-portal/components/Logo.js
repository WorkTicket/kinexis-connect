import { BRAND } from '@/lib/config';
import Link from 'next/link';

export default function Logo() {
  return (<Link className="brand" href="/" aria-label="KINEXIS Client Portal home">
    <picture className="logo"><img src={BRAND.logo} alt="Kinexis Digital" width="150" height="50" /></picture>
    <span className="brand-divider" aria-hidden="true" />
    <span className="brand-title">Client Portal</span>
  </Link>);
}
