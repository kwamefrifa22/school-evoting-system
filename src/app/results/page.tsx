
"use client";

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Users, TrendingUp, AlertCircle, Timer } from 'lucide-react';
import Image from 'next/image';
import { Class, Candidate, Position, SystemConfig } from '@/lib/types';

export default function ResultsPage() {
  const supabase = createClient();
  const [classes, setClasses] = useState<Class[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");

  const fetchData = async () => {
    const { data: cls } = await supabase.from('classes').select('*').order('name');
    const { data: pos } = await supabase.from('positions').select('*').order('order_index');
    const { data: cand } = await supabase.from('candidates').select('*');
    const { data: cfg } = await supabase.from('system_config').select('*').eq('id', 'election_status').maybeSingle();

    if (cls) setClasses(cls);
    if (pos) setPositions(pos);
    if (cand) setCandidates(cand);
    if (cfg) setConfig(cfg);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase.channel('results_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'positions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, fetchData)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Timer Effect
  useEffect(() => {
    if (!config?.is_open || !config?.opened_at) {
      setElapsedTime("00:00:00");
      return;
    }

    const interval = setInterval(() => {
      const start = new Date(config.opened_at!).getTime();
      const now = new Date().getTime();
      const diff = now - start;

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      setElapsedTime(
        `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [config?.is_open, config?.opened_at]);

  const totals = useMemo(() => {
    const votes = classes.reduce((acc, curr) => acc + (curr.votes_cast || 0), 0);
    const eligible = classes.reduce((acc, curr) => acc + curr.population, 0);
    return {
      votes,
      eligible,
      turnout: eligible > 0 ? Math.round((votes / eligible) * 100) : 0
    };
  }, [classes]);

  const getCandidateStyles = (rank: number, total: number, votes: number) => {
    if (votes === 0) return 'bg-gray-50 border-gray-200 opacity-60 grayscale-[0.5]';
    if (rank === 0) return 'bg-emerald-50 border-emerald-500 shadow-emerald-100 ring-2 ring-emerald-500/20';
    if (rank === total - 1 && total > 2) return 'bg-rose-50 border-rose-300 opacity-80';
    return 'bg-white border-gray-100';
  };

  const getRankBadgeColor = (rank: number, total: number, votes: number) => {
    if (votes === 0) return 'bg-gray-300 text-gray-600 border-gray-400';
    if (rank === 0) return 'bg-emerald-500 text-white border-emerald-600 animate-pulse';
    if (rank === total - 1 && total > 2) return 'bg-rose-500 text-white border-rose-600';
    return 'bg-secondary text-white border-secondary/20';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-secondary text-white py-8 px-8 md:px-12 flex flex-col md:flex-row items-center justify-between sticky top-0 z-50 border-b-4 border-accent shadow-2xl">
        <div className="flex items-center gap-6 mb-4 md:mb-0">
          <div className="bg-accent p-3 rounded-2xl rotate-3 shadow-lg">
            <Trophy className="w-10 h-10 text-secondary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter leading-tight">Live Scoreboard</h1>
            <p className="text-xs font-bold text-accent tracking-[0.3em] uppercase">CIS Sovereign Electoral Data</p>
          </div>
        </div>
        
        <div className="flex gap-6 md:gap-16 w-full md:w-auto justify-center">
          <div className="bg-white/10 px-8 py-3 rounded-3xl backdrop-blur-md border border-white/10 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1 flex items-center justify-center gap-2">
              <Timer className="w-3 h-3" /> Duration
            </p>
            <p className="text-3xl font-black text-accent font-mono">{elapsedTime}</p>
          </div>
          <div className="bg-white/10 px-8 py-3 rounded-3xl backdrop-blur-md border border-white/10 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Participation</p>
            <p className="text-3xl font-black text-accent">{totals.turnout}%</p>
          </div>
          <div className="bg-white/10 px-8 py-3 rounded-3xl backdrop-blur-md border border-white/10 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Total Tally</p>
            <p className="text-3xl font-black text-primary-foreground">{totals.votes}</p>
          </div>
        </div>
      </div>
      
      <main className="max-w-[2560px] mx-auto px-8 py-16 space-y-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12">
          {positions.map(pos => {
            const posCandidates = candidates
              .filter(c => c.position_id === pos.id)
              .sort((a, b) => (b.votes || 0) - (a.votes || 0));

            return (
              <div key={pos.id} className="flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-4 mb-6">
                  <div className="bg-secondary text-white px-6 py-2 rounded-xl font-black uppercase tracking-tight text-sm skew-x-[-6deg] shadow-lg border-l-4 border-accent">
                    {pos.name}
                  </div>
                  <div className="h-0.5 bg-gray-200 flex-1" />
                </div>

                <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden flex-1 flex flex-col p-6 space-y-4">
                  {posCandidates.map((cand, idx) => {
                    const styles = getCandidateStyles(idx, posCandidates.length, cand.votes || 0);
                    const badgeStyles = getRankBadgeColor(idx, posCandidates.length, cand.votes || 0);
                    const isWinner = idx === 0 && (cand.votes || 0) > 0;

                    return (
                      <div 
                        key={cand.id} 
                        className={`group relative p-6 rounded-[2rem] border transition-all duration-300 flex items-center gap-6 ${styles}`}
                      >
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg border-b-4 shrink-0 shadow-md transition-transform group-hover:scale-110 ${badgeStyles}`}>
                          {idx + 1}
                        </div>

                        <div className={`relative w-20 h-20 rounded-[1.5rem] overflow-hidden shrink-0 border-4 shadow-inner transition-all ${isWinner ? 'border-emerald-500 scale-105' : 'border-white'}`}>
                          <Image src={cand.photo_url} alt="" fill className="object-cover" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className={`font-black text-lg uppercase truncate tracking-tight ${idx === 0 && (cand.votes || 0) > 0 ? 'text-emerald-800' : 'text-secondary'}`}>
                            {cand.full_name}
                          </h4>
                          {isWinner && (
                            <div className="flex items-center gap-2 mt-1">
                              <TrendingUp className="w-4 h-4 text-emerald-500" />
                              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em]">Frontrunner</span>
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0 min-w-[80px]">
                          <p className={`text-4xl font-black tracking-tighter tabular-nums leading-none ${isWinner ? 'text-emerald-700' : 'text-secondary'}`}>
                            {cand.votes || 0}
                          </p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Votes</p>
                        </div>
                      </div>
                    );
                  })}

                  {posCandidates.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-30">
                      <AlertCircle className="w-12 h-12 mb-4" />
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-center">No Candidates</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
