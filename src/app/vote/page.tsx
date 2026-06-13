
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { Class, Position, Candidate, VoterToken } from '@/lib/types';
import { ElectionHeader } from '@/components/shared/ElectionHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ChevronRight, AlertTriangle, ArrowLeft, Key } from 'lucide-react';
import Image from 'next/image';

export default function VotePage() {
  const db = useFirestore();
  const { data: positions = [] } = useCollection<Position>(collection(db!, 'positions'));
  const { data: candidates = [] } = useCollection<Candidate>(collection(db!, 'candidates'));
  const { data: classes = [] } = useCollection<Class>(collection(db!, 'classes'));

  const [step, setStep] = useState<'token' | 'voting' | 'confirm' | 'success'>('token');
  const [tokenInput, setTokenInput] = useState('');
  const [currentToken, setCurrentToken] = useState<VoterToken | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateToken = async () => {
    if (!tokenInput) return;
    setError(null);
    const tokenRef = doc(db!, 'voter_tokens', tokenInput.toUpperCase());
    const snap = await getDoc(tokenRef);
    
    if (snap.exists()) {
      const data = snap.data() as VoterToken;
      if (data.status === 'used') {
        setError("This token has already been used.");
      } else {
        setCurrentToken(data);
        setStep('voting');
      }
    } else {
      setError("Invalid token code.");
    }
  };

  const handleCandidateSelect = (posId: string, candId: string) => {
    setSelections(prev => ({ ...prev, [posId]: candId }));
  };

  const isVotingComplete = positions.every(pos => selections[pos.id]);

  const handleSubmit = async () => {
    if (!currentToken) return;
    setIsSubmitting(true);
    
    try {
      // 1. Mark token as used
      const tokenRef = doc(db!, 'voter_tokens', currentToken.id);
      await updateDoc(tokenRef, { status: 'used', used_at: serverTimestamp() });

      // 2. Increment class votes
      const classRef = doc(db!, 'classes', currentToken.class_id);
      await updateDoc(classRef, { votes_cast: increment(1) });

      // 3. Increment candidate votes
      for (const posId of Object.keys(selections)) {
        const candId = selections[posId];
        const candRef = doc(db!, 'candidates', candId);
        await updateDoc(candRef, { votes: increment(1) });
      }

      setStep('success');
    } catch (e) {
      setError("Failed to record vote. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 text-center shadow-2xl max-w-xl w-full space-y-6">
          <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-16 h-16" />
          </div>
          <h2 className="text-3xl font-headline font-black text-secondary uppercase">Vote Recorded!</h2>
          <p className="text-muted-foreground text-lg">Thank you for participating in the CIS Prefectorial Elections.</p>
          <Button className="w-full" onClick={() => window.location.reload()}>Next Student</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <ElectionHeader />
      
      <main className="max-w-4xl mx-auto px-4 py-12">
        {step === 'token' && (
          <div className="max-w-md mx-auto space-y-6">
            <header className="text-center space-y-2">
              <h2 className="text-2xl font-headline font-bold text-secondary">Voter Authentication</h2>
              <p className="text-muted-foreground">Enter your unique student voter token</p>
            </header>
            <Card className="border-none shadow-xl">
              <CardContent className="pt-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-secondary uppercase tracking-wider">Voter Token</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 text-muted-foreground w-5 h-5" />
                    <Input 
                      className="h-14 pl-12 text-2xl font-black uppercase tracking-widest text-primary"
                      placeholder="6-DIGIT CODE"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && validateToken()}
                    />
                  </div>
                </div>
                {error && <p className="text-destructive text-sm font-bold text-center">{error}</p>}
                <Button className="w-full h-14 text-lg font-bold" onClick={validateToken}>Authenticate</Button>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800 text-xs">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p>Each token is valid for a single voting session. Please consult your class teacher if your token is missing or invalid.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'voting' && (
          <div className="space-y-12">
            <div className="flex items-center justify-between sticky top-[80px] bg-[#F5F5F5]/90 backdrop-blur p-4 z-40 rounded-xl">
              <div>
                <h2 className="text-2xl font-headline font-bold text-secondary">Digital Ballot</h2>
                <p className="text-muted-foreground">Logged in with token: <span className="font-bold text-primary">{currentToken?.id}</span></p>
              </div>
              <Badge className="bg-primary text-white h-8 px-4 text-sm">
                {Object.keys(selections).length} / {positions.length} Selected
              </Badge>
            </div>

            {positions.sort((a,b) => a.order_index - b.order_index).map(pos => (
              <section key={pos.id} className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-px bg-border flex-1" />
                  <h3 className="text-xl font-headline font-black text-primary uppercase tracking-tight">{pos.name}</h3>
                  <div className="h-px bg-border flex-1" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {candidates.filter(c => c.position_id === pos.id).map(cand => (
                    <Card 
                      key={cand.id}
                      className={`relative overflow-hidden cursor-pointer transition-all border-2 ${
                        selections[pos.id] === cand.id 
                        ? 'border-primary shadow-lg scale-[1.02]' 
                        : 'border-transparent hover:border-muted'
                      }`}
                      onClick={() => handleCandidateSelect(pos.id, cand.id)}
                    >
                      <div className="aspect-square relative">
                        <Image src={cand.photo_url} alt={cand.full_name} fill className="object-cover" />
                        {selections[pos.id] === cand.id && (
                          <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                            <div className="bg-primary text-white p-2 rounded-full shadow-xl">
                              <CheckCircle2 className="w-8 h-8" />
                            </div>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4 bg-white text-center">
                        <h4 className="font-bold text-secondary text-lg">{cand.full_name}</h4>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}

            <div className="flex justify-end pt-8">
              <Button 
                size="lg" 
                className="bg-accent hover:bg-accent/90 text-secondary font-black text-lg px-12 h-16 rounded-2xl shadow-xl disabled:opacity-50"
                disabled={!isVotingComplete}
                onClick={() => setStep('confirm')}
              >
                Review Selections <ChevronRight className="ml-2 w-6 h-6" />
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="max-w-2xl mx-auto space-y-8">
            <header className="text-center space-y-2">
              <h2 className="text-3xl font-headline font-black text-secondary uppercase">FINAL CONFIRMATION</h2>
              <p className="text-muted-foreground">Please review your selections before casting your vote.</p>
            </header>

            <div className="space-y-4">
              {positions.map(pos => {
                const candidate = candidates.find(c => c.id === selections[pos.id]);
                return (
                  <Card key={pos.id} className="border-none shadow-md overflow-hidden">
                    <div className="flex items-center p-4 gap-6">
                      <div className="w-16 h-16 rounded-xl overflow-hidden relative shrink-0">
                        <Image src={candidate?.photo_url || ''} alt="" fill className="object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-primary uppercase tracking-widest">{pos.name}</p>
                        <h4 className="text-xl font-bold text-secondary">{candidate?.full_name}</h4>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="flex gap-4 pt-8">
              <Button variant="outline" className="flex-1 h-14 rounded-xl text-lg" onClick={() => setStep('voting')}>Back</Button>
              <Button 
                className="flex-[2] h-14 rounded-xl text-lg bg-primary hover:bg-primary/90 shadow-xl"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing..." : "Confirm & Submit"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
