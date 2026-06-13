
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MOCK_CLASSES, MOCK_POSITIONS, MOCK_CANDIDATES } from '@/lib/mock-data';
import { Class, Position, Candidate, VoteSelection } from '@/lib/types';
import { ElectionHeader } from '@/components/shared/ElectionHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, User, ChevronRight, AlertTriangle, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

export default function VotePage() {
  const router = useRouter();
  const [step, setStep] = useState<'class' | 'voting' | 'confirm' | 'success'>('class');
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('cis_vote_session');
    if (session) {
      setStep('success');
    }
  }, []);

  const handleClassSelection = (classId: string) => {
    const cls = MOCK_CLASSES.find(c => c.id === classId);
    if (cls) {
      if ((cls.votes_cast || 0) >= cls.population) {
        alert("Voting for your class is now closed.");
        return;
      }
      setSelectedClass(cls);
      setStep('voting');
    }
  };

  const handleCandidateSelect = (posId: string, candId: string) => {
    setSelections(prev => ({ ...prev, [posId]: candId }));
  };

  const isVotingComplete = MOCK_POSITIONS.every(pos => selections[pos.id]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      localStorage.setItem('cis_vote_session', JSON.stringify({
        classId: selectedClass?.id,
        timestamp: Date.now()
      }));
      setStep('success');
      setIsSubmitting(false);
    }, 1500);
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 text-center shadow-2xl max-w-xl w-full space-y-6 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-16 h-16" />
          </div>
          <h2 className="text-3xl font-headline font-black text-secondary uppercase">Vote Recorded!</h2>
          <p className="text-muted-foreground text-lg">
            Your vote has been successfully recorded for the 2026/2027 Prefectorial Elections.
          </p>
          <div className="pt-6">
            <p className="text-sm font-semibold text-secondary/60">Country International School</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <ElectionHeader />
      
      <main className="max-w-4xl mx-auto px-4 py-12">
        {step === 'class' && (
          <div className="max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header className="text-center space-y-2">
              <h2 className="text-2xl font-headline font-bold text-secondary">Voter Entry</h2>
              <p className="text-muted-foreground">Please select your class to begin the voting process.</p>
            </header>
            <Card className="border-none shadow-xl">
              <CardContent className="pt-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-secondary uppercase tracking-wider">Classroom</label>
                  <Select onValueChange={handleClassSelection}>
                    <SelectTrigger className="h-14 text-lg border-2 focus:ring-primary">
                      <SelectValue placeholder="Choose your class..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_CLASSES.map(cls => (
                        <SelectItem 
                          key={cls.id} 
                          value={cls.id}
                          disabled={(cls.votes_cast || 0) >= cls.population}
                        >
                          <div className="flex justify-between w-full min-w-[300px]">
                            <span>{cls.name}</span>
                            {(cls.votes_cast || 0) >= cls.population && (
                              <Badge variant="destructive" className="ml-auto">FULL</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800 text-sm">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p>You can only vote once. Please ensure you select candidates for all positions before submitting.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'voting' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between sticky top-[80px] bg-[#F5F5F5]/90 backdrop-blur p-4 z-40 rounded-xl">
              <div>
                <h2 className="text-2xl font-headline font-bold text-secondary">{selectedClass?.name} Ballot</h2>
                <p className="text-muted-foreground">Select one candidate per position</p>
              </div>
              <Badge className="bg-primary text-white h-8 px-4 text-sm">
                {Object.keys(selections).length} / {MOCK_POSITIONS.length} Selected
              </Badge>
            </div>

            {MOCK_POSITIONS.map(pos => (
              <section key={pos.id} className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-px bg-border flex-1" />
                  <h3 className="text-xl font-headline font-black text-primary uppercase tracking-tight">{pos.name}</h3>
                  <div className="h-px bg-border flex-1" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {MOCK_CANDIDATES.filter(c => c.position_id === pos.id).map(cand => (
                    <Card 
                      key={cand.id}
                      className={`relative overflow-hidden cursor-pointer transition-all border-2 ${
                        selections[pos.id] === cand.id 
                        ? 'border-primary shadow-lg ring-2 ring-primary/20 scale-[1.02]' 
                        : 'border-transparent hover:border-muted hover:shadow-md'
                      }`}
                      onClick={() => handleCandidateSelect(pos.id, cand.id)}
                    >
                      <div className="aspect-square relative grayscale-[0.2] hover:grayscale-0 transition-all">
                        <Image 
                          src={cand.photo_url} 
                          alt={cand.full_name} 
                          fill 
                          className="object-cover"
                        />
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
                        <p className="text-sm text-muted-foreground">{pos.name}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}

            <div className="flex justify-between items-center pt-8">
              <Button variant="ghost" onClick={() => setStep('class')}>
                <ArrowLeft className="mr-2 w-4 h-4" /> Change Class
              </Button>
              <Button 
                size="lg" 
                className="bg-accent hover:bg-accent/90 text-secondary font-black text-lg px-12 h-16 rounded-2xl shadow-xl disabled:opacity-50"
                disabled={!isVotingComplete}
                onClick={() => setStep('confirm')}
              >
                Proceed to Confirm <ChevronRight className="ml-2 w-6 h-6" />
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in zoom-in-95 duration-500">
            <header className="text-center space-y-2">
              <h2 className="text-3xl font-headline font-black text-secondary">REVIEW YOUR BALLOT</h2>
              <p className="text-muted-foreground">Once submitted, you cannot change your choices.</p>
            </header>

            <div className="space-y-4">
              {MOCK_POSITIONS.map(pos => {
                const candidate = MOCK_CANDIDATES.find(c => c.id === selections[pos.id]);
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
              <Button variant="outline" className="flex-1 h-14 rounded-xl text-lg" onClick={() => setStep('voting')}>
                Back to Edit
              </Button>
              <Button 
                className="flex-[2] h-14 rounded-xl text-lg bg-primary hover:bg-primary/90 shadow-xl"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Confirm & Cast My Vote"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
