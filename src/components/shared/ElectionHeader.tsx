
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export function ElectionHeader() {
  return (
    <div className="w-full bg-secondary text-white py-4 px-6 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="bg-primary p-1.5 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="font-headline font-black text-lg tracking-wider hidden sm:inline uppercase">
            CIS PREFECTORIAL ELECTIONS
          </span>
          <span className="font-headline font-black text-lg tracking-wider sm:hidden uppercase">
            CIS ELECTIONS
          </span>
        </Link>
        <div className="flex gap-4 text-sm font-medium opacity-80">
          <Link href="/vote" className="hover:text-accent transition-colors">Vote</Link>
          <Link href="/results" className="hover:text-accent transition-colors">Results</Link>
        </div>
      </div>
    </div>
  );
}
