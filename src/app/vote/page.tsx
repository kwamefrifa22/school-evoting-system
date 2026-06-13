
"use client";

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Position, Candidate, VoterToken, SystemConfig } from '@/lib/types';
import { ElectionHeader } from '@/components/shared/ElectionHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, ChevronRight, ChevronLeft, AlertTriangle, Key, Lock, ArrowRight } from 'lucide-react';
import Image from 'next/image';

export default function VotePage() {
  const supabase = createClient();
  
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);

  const [step, setStep] = useState<'token' | 'voting' | 'confirm' | 'success'>('token');
  const [currentPosIndex, setCurrentPosIndex] = useState(0);
  const [tokenInput, setTokenInput] = useState('');
  const [currentToken, setCurrentToken] = useState<VoterToken | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedPositions = useMemo(() => {
    return [...positions].sort((a, b) => a.order_index - b.order_index);
  }, [positions]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: pos } = await supabase.from('positions').select('*').order('order_index');
      const { data: cand } = await supabase.from('candidates').select('*');
      const { data: cfg } = await supabase.from('system_config').select('*').eq('id', 'election_status').maybeSingle();
      
      if (pos) setPositions(pos);
      if (cand) setCandidates(cand);
      if (cfg) setConfig(cfg);
    };
    fetchData();

    const channel = supabase.channel('status_check')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_config' }, payload => {
        setConfig(payload.new as SystemConfig);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const validateToken = async () => {
    if (!tokenInput) return;
    setError(null);
    
    const { data, error: fetchError } = await supabase
      .from('voter_tokens')
      .select('*')
      .eq('id', tokenInput.toUpperCase())
      .maybeSingle();
    
    if (data) {
      if (data.status === 'used') {
        setError("This token has already been used.");
      } else {
        setCurrentToken(data);
        setStep('voting');
      }
    } else {
      setError("Invalid token code. Please check your printed token.");
    }
  };

  const handleCandidateSelect = (posId: string, candId: string) => {
    setSelections(prev => ({ ...prev, [posId]: candId }));
    
    // Auto-advance logic
    if (currentPosIndex < sortedPositions.length - 1) {
      setTimeout(() => {
        setCurrentPosIndex(prev => prev + 1);
      }, 300); // Small delay for visual feedback
    }
  };

  const isVotingComplete = sortedPositions.every(pos => selections[pos.id]);

  const handleSubmit = async () => {
    if (!currentToken) return;
    setIsSubmitting(true);
    
    try {
      // 1. Mark token as used
      await supabase.from('voter_tokens').update({ 
        status: 'used', 
        used_at: new Date().toISOString() 
      }).eq('id', currentToken.id);

      // 2. Increment class votes_cast
      const { data: clsData } = await supabase.from('classes').select('votes_cast').eq('id', currentToken.class_id).single();
      await supabase.from('classes').update({ votes_cast: (clsData?.votes_cast || 0) + 1 }).eq('id', currentToken.class_id);

      // 3. Increment candidate votes
      for (const posId of Object.keys(selections)) {
        const candId = selections[posId];
        const { data: candData } = await supabase.from('candidates').select('votes').eq('id', candId).single();
        await supabase.from('candidates').update({ votes: (candData?.votes || 0) + 1 }).eq('id', candId);
      }

      setStep('success');
    } catch (e) {
      setError("Failed to record vote. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!config?.is_open && step !== 'success') {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-none shadow-2xl">
          <CardHeader className="text-center">
            <Lock className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <CardTitle className="text-2xl font-headline font-black text-secondary">POLLS ARE CLOSED</CardTitle>
            <CardDescription>Voting is currently disabled. Please wait for an administrator to open the polls.</CardDescription>
          </CardHeader>
          <CardContent>
             <Button className="w-full" variant="outline" onClick={() => window.location.href = '/'}>Return Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 md:p-12 text-center shadow-2xl max-w-xl w-full space-y-6">
          <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-16 h-16" />
          </div>
          <h2 className="text-3xl font-headline font-black text-secondary uppercase">Vote Recorded!</h2>
          <p className="text-muted-foreground text-lg">Thank you for participating in the CIS Prefectorial Elections.</p>
          <Button className="w-full h-14 text-lg font-bold rounded-xl" onClick={() => window.location.reload()}>Next Student</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <ElectionHeader />
      
      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {step === 'token' && (
          <div className="max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                      placeholder="ABC-123456"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && validateToken()}
                    />
                  </div>
                </div>
                {error && <p className="text-destructive text-sm font-bold text-center">{error}</p>}
                <Button className="w-full h-14 text-lg font-bold rounded-xl" onClick={validateToken}>Authenticate</Button>
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800 text-xs">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p>Each token is valid for a single voting session. Tokens are distributed by class teachers.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'voting' && sortedPositions.length > 0 && (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* Voting Progress Header */}
            <div className="bg-white p-6 rounded-3xl shadow-md border border-gray-100 sticky top-[80px] z-40">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-2xl font-headline font-black text-secondary uppercase tracking-tight">
                    {sortedPositions[currentPosIndex].name}
                  </h2>
                  <p className="text-sm text-muted-foreground font-medium">Position {currentPosIndex + 1} of {sortedPositions.length}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden md:block text-right">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Election Progress</p>
                    <p className="text-sm font-bold text-primary">{Math.round(((currentPosIndex + 1) / sortedPositions.length) * 100)}% Complete</p>
                  </div>
                  <Badge className="bg-primary/10 text-primary border-primary/20 h-10 px-4 rounded-xl text-xs font-bold">
                    {Object.keys(selections).length} / {sortedPositions.length} VOTED
                  </Badge>
                </div>
              </div>
              <Progress value={((currentPosIndex + 1) / sortedPositions.length) * 100} className="h-2" />
            </div>

            {/* Candidate Selection Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {candidates
                .filter(c => c.position_id === sortedPositions[currentPosIndex].id)
                .map(cand => (
                  <Card 
                    key={cand.id}
                    className={`group relative overflow-hidden cursor-pointer transition-all duration-300 border-4 rounded-[2.5rem] ${
                      selections[sortedPositions[currentPosIndex].id] === cand.id 
                      ? 'border-primary bg-primary/5 shadow-2xl scale-[1.02]' 
                      : 'border-transparent hover:border-gray-200 hover:shadow-xl bg-white'
                    }`}
                    onClick={() => handleCandidateSelect(sortedPositions[currentPosIndex].id, cand.id)}
                  >
                    <div className="aspect-square relative m-3 overflow-hidden rounded-[2rem]">
                      <Image 
                        src={cand.photo_url} 
                        alt={cand.full_name} 
                        fill 
                        className="object-cover transition-transform duration-500 group-hover:scale-110" 
                      />
                      {selections[sortedPositions[currentPosIndex].id] === cand.id && (
                        <div className="absolute inset-0 bg-primary/40 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-300">
                          <div className="bg-white text-primary p-4 rounded-full shadow-2xl scale-110">
                            <CheckCircle2 className="w-12 h-12" />
                          </div>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6 text-center">
                      <h4 className={`font-black text-xl uppercase tracking-tight transition-colors ${
                        selections[sortedPositions[currentPosIndex].id] === cand.id ? 'text-primary' : 'text-secondary'
                      }`}>
                        {cand.full_name}
                      </h4>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Select Candidate</p>
                    </CardContent>
                  </Card>
                ))}
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center justify-between pt-8">
              <Button 
                variant="outline" 
                size="lg"
                className="h-16 px-8 rounded-2xl border-2 font-bold gap-2"
                onClick={() => setCurrentPosIndex(prev => Math.max(0, prev - 1))}
                disabled={currentPosIndex === 0}
              >
                <ChevronLeft className="w-5 h-5" /> Previous Role
              </Button>

              <div className="flex gap-4">
                {currentPosIndex < sortedPositions.length - 1 ? (
                  <Button 
                    size="lg"
                    className="h-16 px-10 rounded-2xl bg-secondary hover:bg-secondary/90 text-white font-bold gap-2"
                    onClick={() => setCurrentPosIndex(prev => prev + 1)}
                  >
                    Next Role <ChevronRight className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button 
                    size="lg"
                    className="h-16 px-12 rounded-2xl bg-accent hover:bg-accent/90 text-secondary font-black text-lg shadow-xl gap-2 disabled:opacity-50"
                    disabled={!isVotingComplete}
                    onClick={() => setStep('confirm')}
                  >
                    Final Review <ArrowRight className="w-6 h-6" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <header className="text-center space-y-2">
              <div className="w-16 h-16 bg-accent/20 text-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-headline font-black text-secondary uppercase tracking-tight">Verify Your Ballot</h2>
              <p className="text-muted-foreground">Please ensure all selections are correct. This action cannot be undone.</p>
            </header>

            <div className="space-y-4">
              {sortedPositions.map(pos => {
                const candidate = candidates.find(c => c.id === selections[pos.id]);
                return (
                  <Card key={pos.id} className="border-none shadow-lg overflow-hidden rounded-3xl bg-white hover:shadow-xl transition-shadow">
                    <div className="flex items-center p-5 gap-6">
                      <div className="w-20 h-20 rounded-2xl overflow-hidden relative shrink-0 border-2 border-gray-50 shadow-inner">
                        <Image src={candidate?.photo_url || ''} alt="" fill className="object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">{pos.name}</p>
                        <h4 className="text-xl font-black text-secondary uppercase tracking-tight">{candidate?.full_name}</h4>
                      </div>
                      <div className="bg-emerald-50 text-emerald-600 p-2 rounded-full">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              <Button 
                variant="outline" 
                className="flex-1 h-16 rounded-2xl text-lg font-bold border-2" 
                onClick={() => setStep('voting')}
              >
                Go Back & Edit
              </Button>
              <Button 
                className="flex-[2] h-16 rounded-2xl text-xl font-black bg-primary hover:bg-primary/90 shadow-2xl uppercase tracking-wider"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    Recording Vote...
                  </div>
                ) : (
                  "Confirm & Submit Vote"
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
