
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Vote, ShieldCheck, Lock } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-12 text-center">
        <header className="space-y-6">
          <div className="w-32 h-32 bg-primary mx-auto rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl rotate-3">
            <ShieldCheck className="w-16 h-16" />
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl md:text-6xl font-headline font-black text-secondary uppercase tracking-tighter">
              CIS SOVEREIGN
            </h1>
            <p className="text-xs font-black text-accent tracking-[0.4em] uppercase">2026/2027 Prefectorial Elections</p>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">
            Country International School's official digital ballot system. Ensuring every student's voice is heard with absolute integrity.
          </p>
        </header>

        <div className="max-w-md mx-auto">
          <Card className="hover:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] transition-all duration-500 border-none group cursor-pointer rounded-[3rem] overflow-hidden">
            <Link href="/vote" className="block h-full">
              <CardHeader className="pt-12 pb-6">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-500 group-hover:scale-110">
                  <Vote className="w-10 h-10" />
                </div>
                <CardTitle className="text-3xl text-secondary font-black uppercase tracking-tight">Voter Portal</CardTitle>
                <CardDescription className="text-lg font-medium">Authorized student entry only</CardDescription>
              </CardHeader>
              <CardContent className="pb-12 px-10">
                <Button className="w-full bg-primary hover:bg-primary/90 text-white font-black py-8 rounded-2xl text-xl shadow-xl transition-all active:scale-95">
                  AUTHENTICATE & VOTE
                </Button>
              </CardContent>
            </Link>
          </Card>
        </div>

        <footer className="pt-12 text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em] flex flex-col items-center gap-6">
          <p>© 2026 Country International School. Protected by CIS Sovereign Security.</p>
          <Link href="/cisadminportal" className="flex items-center gap-2 px-6 py-2 bg-secondary/5 rounded-full hover:bg-secondary/10 hover:text-primary transition-all text-secondary">
            <Lock className="w-3 h-3" /> STAFF ACCESS
          </Link>
        </footer>
      </div>
    </div>
  );
}
