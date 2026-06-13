
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Vote, Trophy, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8 text-center">
        <header className="space-y-4">
          <div className="w-24 h-24 bg-primary mx-auto rounded-full flex items-center justify-center text-white shadow-xl">
            <ShieldCheck className="w-12 h-12" />
          </div>
          <h1 className="text-4xl md:text-5xl font-headline font-black text-secondary uppercase tracking-tight">
            2026/2027 CIS PREFECTORIAL ELECTIONS
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Welcome to the CIS Sovereign portal. Secure, transparent, and real-time student leadership selection.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          <Card className="hover:shadow-2xl transition-all duration-300 border-none group cursor-pointer">
            <Link href="/vote" className="block h-full">
              <CardHeader className="pt-8">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
                  <Vote className="w-8 h-8" />
                </div>
                <CardTitle className="text-2xl text-secondary">Voter Portal</CardTitle>
                <CardDescription>Enter your classroom credentials to cast your vote</CardDescription>
              </CardHeader>
              <CardContent className="pb-8">
                <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6 rounded-xl">
                  Cast Your Vote
                </Button>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-2xl transition-all duration-300 border-none group cursor-pointer">
            <Link href="/results" className="block h-full">
              <CardHeader className="pt-8">
                <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-accent group-hover:text-black transition-colors">
                  <Trophy className="w-8 h-8" />
                </div>
                <CardTitle className="text-2xl text-secondary">Real-time Results</CardTitle>
                <CardDescription>View live turnout and candidate leaderboards</CardDescription>
              </CardHeader>
              <CardContent className="pb-8">
                <Button variant="outline" className="w-full border-accent text-secondary hover:bg-accent/10 font-bold py-6 rounded-xl">
                  View Results
                </Button>
              </CardContent>
            </Link>
          </Card>
        </div>

        <footer className="mt-16 text-muted-foreground text-sm">
          <p>© 2026 Country International School. All Rights Reserved.</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link href="/admin" className="hover:text-primary underline">Staff Access</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
