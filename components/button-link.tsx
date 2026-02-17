import Link from 'next/link';

export default function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-white/12 border border-white/20 text-sm font-semibold text-white hover:bg-white/20 transition"
    >
      {children}
    </Link>
  );
}
