"use client";

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/badge';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Users, CheckCircle, Medal, TrendingUp, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { Class, Candidate, Position } from '@/lib/types';

export default function ResultsPage() {
  const supabase = createClient();
  const [classes, setClasses] = useState<Class[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const fetchData = async () => {
    const { data: cls } = await supabase.from('classes').select('*').order('name');
    const { data: pos } = await supabase.from('positions').select('*').order('order_index');
    const { data: cand } = await supabase.from('candidates').select('*');

    if (cls) setClasses(cls);
    if (pos) setPositions(pos);
    if (cand) setCandidates(cand);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('results_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'positions' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const totals = useMemo(() => {
    const votes = classes.reduce((acc, curr) => acc + (curr.votes_cast || 0), 0);
    const eligible = classes.reduce((acc, curr) => acc + curr.population, 0);
    return {
      votes,
      eligible,
      turnout: eligible > 0 ? Math.round((votes / eligible) * 100) : 0
    };
  }, [classes]);

  // Heatmap Color Logic
  const getCandidateStyles = (rank: number, total: number, votes: number) => {
    if (votes === 0) return 'bg-gray-50 border-gray-200 opacity-60 grayscale-[0.5]';
    if (rank === 0) return 'bg-emerald-50 border-emerald-500 shadow-emerald-100 ring-2 ring-emerald-500/20'; // Winner
    if (rank === total - 1 && total > 2) return 'bg-rose-50 border-rose-300 opacity-80'; // Trailing
    if (rank === 1 && total > 2) return 'bg-amber-50 border-amber-400'; // Runner up
    return 'bg-white border-gray-100';
  };

  const getRankBadgeColor = (rank: number, total: number, votes: number) => {
    if (votes === 0) return 'bg-gray-300 text-gray-600 border-gray-400';
    if (rank === 0) return 'bg-emerald-500 text-white border-emerald-600 animate-pulse';
    if (rank === total - 1 && total > 2) return 'bg-rose-500 text-white border-rose-600';
    return 'bg-secondary text-white border-secondary/20';
  };

  const getVoteColor = (rank: number, total: number, votes: number) => {
    if (votes === 0) return 'text-gray-400';
    if (rank === 0) return 'text-emerald-700';
    if (rank === total - 1 && total > 2) return 'text-rose-600';
    return 'text-secondary';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Dynamic Header */}
      <div className="bg-secondary text-white py-6 px-4 md:px-8 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 border-b-4 border-accent shadow-2xl">
        <div className="flex items-center gap-4 mb-4 md:mb-0">
          <div className="bg-accent p-2 rounded-xl rotate-3 shadow-lg">
            <Trophy className="w-8 h-8 text-secondary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-tight">Live Scoreboard</h1>
            <p className="text-[10px] font-bold text-accent tracking-[0.2em] uppercase">Country International School</p>
          </div>
        </div>
        
        <div className="flex gap-4 md:gap-12 w-full md:w-auto justify-center">
          <div className="bg-white/10 px-6 py-2 rounded-2xl backdrop-blur-md border border-white/10 text-center flex-1 md:flex-none">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">Participation</p>
            <p className="text-2xl font-black text-accent">{totals.turnout}%</p>
          </div>
          <div className="bg-white/10 px-6 py-2 rounded-2xl backdrop-blur-md border border-white/10 text-center flex-1 md:flex-none">
            <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">Votes Tally</p>
            <p className="text-2xl font-black text-primary-foreground">{totals.votes}</p>
          </div>
        </div>
      </div>
      
      <main className="max-w-[1600px] mx-auto px-4 py-12 space-y-16">
        {/* Positions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {positions.map(pos => {
            const posCandidates = candidates
              .filter(c => c.position_id === pos.id)
              .sort((a, b) => (b.votes || 0) - (a.votes || 0));

            return (
              <div key={pos.id} className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-secondary text-white px-4 py-1.5 rounded-lg font-black uppercase tracking-tight text-xs skew-x-[-6deg] shadow-md border-l-4 border-accent">
                    {pos.name}
                  </div>
                  <div className="h-px bg-gray-200 flex-1" />
                </div>

                <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden flex-1 flex flex-col p-4 space-y-3">
                  {posCandidates.map((cand, idx) => {
                    const styles = getCandidateStyles(idx, posCandidates.length, cand.votes || 0);
                    const badgeStyles = getRankBadgeColor(idx, posCandidates.length, cand.votes || 0);
                    const voteStyles = getVoteColor(idx, posCandidates.length, cand.votes || 0);
                    const isWinner = idx === 0 && (cand.votes || 0) > 0;

                    return (
                      <div 
                        key={cand.id} 
                        className={`group relative p-4 rounded-3xl border transition-all duration-300 flex items-center gap-4 ${styles}`}
                      >
                        {/* Rank */}
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm border-b-2 shrink-0 shadow-sm transition-transform group-hover:scale-110 ${badgeStyles}`}>
                          {idx + 1}
                        </div>

                        {/* Avatar */}
                        <div className={`relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 border-2 shadow-inner transition-all ${isWinner ? 'border-emerald-500 scale-105' : 'border-white'}`}>
                          <Image src={cand.photo_url} alt="" fill className="object-cover" />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-black text-sm uppercase truncate tracking-tight transition-colors ${idx === 0 && (cand.votes || 0) > 0 ? 'text-emerald-800' : 'text-secondary'}`}>
                            {cand.full_name}
                          </h4>
                          {isWinner && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <TrendingUp className="w-3 h-3 text-emerald-500" />
                              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Frontrunner</span>
                            </div>
                          )}
                        </div>

                        {/* Votes */}
                        <div className="text-right shrink-0 min-w-[60px]">
                          <p className={`text-2xl font-black tracking-tighter tabular-nums leading-none ${voteStyles}`}>
                            {cand.votes || 0}
                          </p>
                          <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Votes</p>
                        </div>
                      </div>
                    );
                  })}

                  {posCandidates.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 opacity-40">
                      <AlertCircle className="w-8 h-8 mb-2" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-center">No Candidates Registered</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Participation Summary */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-secondary uppercase tracking-tighter shrink-0 flex items-center gap-2">
              <Users className="w-6 h-6 text-accent" /> Class Engagement Metrics
            </h2>
            <div className="h-0.5 bg-gray-200 flex-1 rounded-full" />
          </div>
          
          <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100 border-b-[12px] border-secondary">
            <Table>
              <TableHeader className="bg-secondary/5 border-b">
                <TableRow className="hover:bg-transparent border-none">
                  <TableHead className="font-black uppercase text-[10px] tracking-widest p-6">Class Group</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest p-6">Eligible</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest p-6">Actual Votes</TableHead>
                  <TableHead className="font-black uppercase text-[10px] tracking-widest p-6">Engagement Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map(cls => {
                  const progress = cls.population > 0 ? Math.round(((cls.votes_cast || 0) / cls.population) * 100) : 0;
                  return (
                    <TableRow key={cls.id} className="hover:bg-accent/5 border-b border-gray-50 last:border-none">
                      <TableCell className="font-black text-secondary text-xl p-6">{cls.name}</TableCell>
                      <TableCell className="font-bold text-gray-500 p-6">{cls.population}</TableCell>
                      <TableCell className="font-black text-primary p-6 text-xl">{cls.votes_cast || 0}</TableCell>
                      <TableCell className="p-6">
                        <div className="flex items-center gap-6">
                          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden border-2 border-white shadow-inner">
                            <div 
                              className={`h-full transition-all duration-1000 shadow-sm ${progress >= 80 ? 'bg-emerald-500' : progress >= 40 ? 'bg-amber-400' : 'bg-rose-500'}`} 
                              style={{ width: `${progress}%` }} 
                            />
                          </div>
                          <div className="w-16 text-right">
                            <span className={`text-sm font-black ${progress >= 80 ? 'text-emerald-600' : progress >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>{progress}%</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      </main>

      <footer className="text-center py-10 opacity-50">
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary">
          Secure Blockchain-Inspired Ledger Monitoring &copy; 2026
        </p>
      </footer>
    </div>
  );
}
