
"use client";

import { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, UserPlus, LayoutDashboard, BrainCircuit, Download, Activity, Sparkles, RefreshCcw, Trash2, CheckCircle2, Lock, Settings2, Users, MonitorPlay, Timer, Image as ImageIcon, Key, Mail, ShieldAlert, Loader2 } from 'lucide-react';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, SidebarSeparator } from '@/components/ui/sidebar';
import { Class, Candidate, Position, VoterToken, SystemConfig } from '@/lib/types';
import { realtimeElectionInsightGeneration, RealtimeElectionInsightGenerationOutput } from '@/ai/flows/realtime-election-insight-generation';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

export default function AdminPage() {
  const supabase = createClient();
  const { toast } = useToast();
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authStep, setAuthStep] = useState<'email' | 'code'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  const ADMIN_EMAIL = 'amoakoafrifa741@gmail.com';

  // Data State
  const [classes, setClasses] = useState<Class[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [allTokens, setAllTokens] = useState<VoterToken[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [recentVotes, setRecentVotes] = useState<VoterToken[]>([]);

  const [activeTab, setActiveTab] = useState('onboarding');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<RealtimeElectionInsightGenerationOutput | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>("00:00:00");

  const [newPosition, setNewPosition] = useState('');
  const [newCandidate, setNewCandidate] = useState({ name: '', positionId: '', fileName: '' });
  const [newClass, setNewClass] = useState({ name: '', population: 0 });

  // Check existing session
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email === ADMIN_EMAIL) {
        setIsAuthenticated(true);
      }
    };
    checkUser();
  }, []);

  const handleEmailAuth = async () => {
    if (emailInput.toLowerCase() !== ADMIN_EMAIL) {
      setAuthError('Unauthorized admin email.');
      return;
    }

    setIsLoading(true);
    setAuthError('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailInput.toLowerCase(),
        options: {
          shouldCreateUser: false, 
        }
      });

      if (error) {
        if (error.message.includes('Signups not allowed')) {
          throw new Error('This email is not registered. Please add it to the Supabase Auth "Users" list manually.');
        }
        throw error;
      }

      console.log("SUCCESS: OTP code requested for:", ADMIN_EMAIL);
      setAuthStep('code');
      toast({
        title: "Verification Sent",
        description: "A 6-digit code has been sent to your email.",
      });
    } catch (err: any) {
      console.error("Supabase Auth Error:", err.message);
      setAuthError(err.message || 'Failed to send verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeAuth = async () => {
    if (!codeInput) return;
    setIsLoading(true);
    setAuthError('');

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: emailInput.toLowerCase(),
        token: codeInput,
        type: 'email',
      });

      if (error) throw error;

      if (data.session) {
        setIsAuthenticated(true);
      } else {
        throw new Error("Verification failed.");
      }
    } catch (err: any) {
      console.error("ERROR: Invalid verification code.");
      setAuthError('Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const { data: cls } = await supabase.from('classes').select('*').order('name');
      const { data: pos } = await supabase.from('positions').select('*').order('order_index');
      const { data: cand } = await supabase.from('candidates').select('*');
      const { data: tokens } = await supabase.from('voter_tokens').select('*');
      const { data: cfg } = await supabase.from('system_config').select('*').eq('id', 'election_status').maybeSingle();
      const { data: recent } = await supabase.from('voter_tokens').select('*').eq('status', 'used').order('used_at', { ascending: false }).limit(10);

      if (cls) setClasses(cls);
      if (pos) setPositions(pos);
      if (cand) setCandidates(cand);
      if (tokens) setAllTokens(tokens);
      if (cfg) setConfig(cfg);
      if (recent) setRecentVotes(recent);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData();

    const channel = supabase.channel('admin_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'positions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidates' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'voter_tokens' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!config?.is_open || !config?.opened_at) {
      setElapsedTime("00:00:00");
      return;
    }

    const interval = setInterval(() => {
      const start = new Date(config.opened_at!).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - start);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsedTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [config?.is_open, config?.opened_at]);

  const stats = useMemo(() => {
    const totalStudents = classes.reduce((acc, curr) => acc + curr.population, 0);
    const totalVotes = classes.reduce((acc, curr) => acc + (curr.votes_cast || 0), 0);
    return {
      totalVotes,
      totalStudents,
      totalClasses: classes.length,
      totalPositions: positions.length,
      turnout: totalStudents > 0 ? Math.round((totalVotes / totalStudents) * 100) : 0
    };
  }, [classes, positions]);

  const toggleElection = async () => {
    const newStatus = !config?.is_open;
    const openedAt = newStatus ? new Date().toISOString() : null;
    
    const { error } = await supabase.from('system_config').upsert({ 
      id: 'election_status',
      is_open: newStatus, 
      opened_at: openedAt 
    }, { onConflict: 'id' });
    
    if (error) {
      console.error("Toggle error:", error);
      toast({ title: "Operation Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ 
        title: newStatus ? "Election Opened" : "Polls Closed", 
        description: newStatus ? "Students can now cast their votes." : "Voting has been disabled." 
      });
      fetchData();
    }
  };

  const handleAddPosition = async () => {
    if (!newPosition) return;
    await supabase.from('positions').insert({ name: newPosition, order_index: positions.length });
    setNewPosition('');
    fetchData();
  };

  const handleAddCandidate = async () => {
    if (!newCandidate.name || !newCandidate.positionId) return;
    const photoUrl = newCandidate.fileName 
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/images/${newCandidate.fileName}`
      : `https://picsum.photos/seed/${Math.random()}/400/400`;

    await supabase.from('candidates').insert({
      full_name: newCandidate.name,
      position_id: newCandidate.positionId,
      photo_url: photoUrl,
      votes: 0
    });
    setNewCandidate({ name: '', positionId: '', fileName: '' });
    fetchData();
  };

  const handleAddClass = async () => {
    if (!newClass.name || newClass.population <= 0) return;
    await supabase.from('classes').insert({ name: newClass.name, population: newClass.population, votes_cast: 0 });
    setNewClass({ name: '', population: 0 });
    fetchData();
  };

  const generateTokens = async (cls: Class) => {
    const count = cls.population + 5;
    const prefix = cls.name.replace(/\s+/g, '').toUpperCase().substring(0, 3);
    const tokensToInsert = [];
    for (let i = 0; i < count; i++) {
      const randomPart = Math.floor(100000 + Math.random() * 900000);
      tokensToInsert.push({ id: `${prefix}-${randomPart}`, class_id: cls.id, status: 'unused' });
    }
    await supabase.from('voter_tokens').insert(tokensToInsert);
    fetchData();
  };

  const deleteItem = async (table: string, id: string) => {
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  };

  const exportTokens = (cls: Class) => {
    const tokens = allTokens.filter(t => t.class_id === cls.id);
    const csvContent = "data:text/csv;charset=utf-8,Token,Status\n" + tokens.map(e => `${e.id},${e.status}`).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `tokens_${cls.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const hourMap: Record<number, number> = {};
      allTokens.filter(t => t.status === 'used' && t.used_at).forEach(t => {
        hourMap[new Date(t.used_at!).getHours()] = (hourMap[new Date(t.used_at!).getHours()] || 0) + 1;
      });
      const result = await realtimeElectionInsightGeneration({
        totalEligibleVoters: stats.totalStudents,
        totalVotesCast: stats.totalVotes,
        votingTrendData: Object.entries(hourMap).map(([h, c]) => ({ hour: parseInt(h), votesInHour: c })),
        classVotingProgress: classes.map(c => ({ className: c.name, population: c.population, votesCast: c.votes_cast || 0 })),
        electionStatus: config?.is_open ? 'open' : 'closed'
      });
      setAiInsight(result);
    } catch (error) {
      console.error("AI failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-none shadow-2xl overflow-hidden rounded-3xl">
          <div className="h-2 bg-accent" />
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-accent" />
            </div>
            <CardTitle className="text-2xl font-black text-secondary uppercase tracking-tight">Admin Gateway</CardTitle>
            <CardDescription className="font-medium">Secure OTP verification required for Sovereign access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {authStep === 'email' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Identify Administrator</label>
                  <div className="bg-muted p-4 rounded-xl border border-dashed border-muted-foreground/30 text-center">
                    <p className="text-sm font-bold text-secondary tracking-widest">a...........1@gmail.com</p>
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                    <Input 
                      placeholder="Confirm full admin email" 
                      className="pl-10 h-12" 
                      disabled={isLoading}
                      value={emailInput} 
                      onChange={e => setEmailInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
                    />
                  </div>
                </div>
                {authError && <p className="text-destructive text-xs font-bold text-center bg-destructive/10 p-2 rounded">{authError}</p>}
                <Button 
                  className="w-full h-12 bg-primary hover:bg-primary/90 font-bold" 
                  onClick={handleEmailAuth}
                  disabled={isLoading || !emailInput}
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Request Verification Code"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Verification Code</label>
                  <p className="text-[10px] text-muted-foreground">A 6-digit code has been sent to your email.</p>
                  <div className="relative">
                    <Key className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                    <Input 
                      placeholder="000000" 
                      className="pl-10 h-12 font-mono tracking-widest text-lg" 
                      disabled={isLoading}
                      value={codeInput} 
                      onChange={e => setCodeInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCodeAuth()}
                    />
                  </div>
                </div>
                {authError && <p className="text-destructive text-xs font-bold text-center bg-destructive/10 p-2 rounded">{authError}</p>}
                <Button 
                  className="w-full h-12 bg-primary hover:bg-primary/90 font-bold" 
                  onClick={handleCodeAuth}
                  disabled={isLoading || !codeInput}
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Enter Control Center"}
                </Button>
                <Button variant="ghost" className="w-full text-xs" onClick={() => { setAuthStep('email'); setAuthError(''); }} disabled={isLoading}>
                  Change Email
                </Button>
              </div>
            )}
          </CardContent>
          <div className="bg-muted/50 p-4 text-center border-t">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Sovereign Security Protocol V3.0</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar className="bg-secondary text-white border-none">
        <SidebarHeader className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg"><Activity className="w-5 h-5" /></div>
            <h2 className="font-headline font-black text-xl tracking-tight uppercase">Sovereign Admin</h2>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveTab('onboarding')} isActive={activeTab === 'onboarding'} className="hover:bg-white/10 h-12 text-white data-[active=true]:bg-primary"><Settings2 className="w-5 h-5 mr-3" /> System Setup</SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveTab('overview')} isActive={activeTab === 'overview'} className="hover:bg-white/10 h-12 text-white data-[active=true]:bg-primary"><LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard</SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveTab('insights')} isActive={activeTab === 'insights'} className="hover:bg-white/10 h-12 text-white data-[active=true]:bg-primary"><BrainCircuit className="w-5 h-5 mr-3" /> AI Insights</SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarSeparator className="my-4 bg-white/10" />
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => window.open('/results', '_blank')} className="hover:bg-accent hover:text-secondary h-12 text-accent border border-accent/20">
                <MonitorPlay className="w-5 h-5 mr-3" /> Launch Results TV
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="bg-[#F5F5F5]">
        <header className="h-20 border-b bg-white flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-xl font-headline font-black text-secondary uppercase tracking-tight">Electoral Control Center</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-accent/10 text-accent rounded-full border border-accent/20">
              <Timer className="w-4 h-4" />
              <span className="font-mono font-bold text-sm">{elapsedTime}</span>
            </div>
            <Badge variant={config?.is_open ? "default" : "secondary"} className={config?.is_open ? "bg-emerald-500" : ""}>{config?.is_open ? "POLLS OPEN" : "POLLS CLOSED"}</Badge>
            <Button size="sm" variant={config?.is_open ? "destructive" : "default"} onClick={toggleElection}>
              {config?.is_open ? <Lock className="w-4 h-4 mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              {config?.is_open ? "Close Polls" : "Open Election"}
            </Button>
          </div>
        </header>

        <main className="p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsContent value="onboarding" className="space-y-8 m-0">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Plus className="w-5 h-5" /> 1. Define Positions</CardTitle>
                    <CardDescription>Add roles that students will contest for.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input placeholder="e.g., Head Prefect" value={newPosition} onChange={e => setNewPosition(e.target.value)} />
                      <Button onClick={handleAddPosition}>Add</Button>
                    </div>
                    <div className="space-y-2">
                      {positions.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-2 bg-muted rounded-md">
                          <span className="font-bold">{p.name}</span>
                          <Button variant="ghost" size="sm" onClick={() => deleteItem('positions', p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><UserPlus className="w-5 h-5" /> 2. Register Candidates</CardTitle>
                    <CardDescription>Assign candidates to positions.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input placeholder="Candidate Full Name" value={newCandidate.name} onChange={e => setNewCandidate({...newCandidate, name: e.target.value})} />
                    <select className="w-full h-10 px-3 rounded-md border" value={newCandidate.positionId} onChange={e => setNewCandidate({...newCandidate, positionId: e.target.value})}>
                      <option value="">Select Position</option>
                      {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Filename in Supabase 'images' bucket" className="pl-10" value={newCandidate.fileName} onChange={e => setNewCandidate({...newCandidate, fileName: e.target.value})} />
                    </div>
                    <Button className="w-full" onClick={handleAddCandidate}>Add Candidate</Button>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {candidates.map(c => (
                        <div key={c.id} className="flex justify-between items-center p-2 bg-muted rounded-md">
                          <div className="flex flex-col">
                            <span className="font-bold">{c.full_name}</span>
                            <span className="text-xs text-muted-foreground">{positions.find(p => p.id === c.position_id)?.name}</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => deleteItem('candidates', c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" /> 3. Class Management & Token Generation</CardTitle>
                    <CardDescription>Set population and generate unique prefixed tokens (Population + 5).</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input placeholder="Class Name (e.g., Grade A1)" value={newClass.name} onChange={e => setNewClass({...newClass, name: e.target.value})} />
                      <Input type="number" placeholder="Class Size" value={newClass.population} onChange={e => setNewClass({...newClass, population: parseInt(e.target.value) || 0})} />
                      <Button onClick={handleAddClass}>Add Class</Button>
                    </div>
                    <Table>
                      <TableHeader><TableRow><TableHead>Class</TableHead><TableHead>Population</TableHead><TableHead>Target Tokens</TableHead><TableHead>Current Count</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {classes.map(cls => {
                          const tokens = allTokens.filter(t => t.class_id === cls.id);
                          const isGenerated = tokens.length >= cls.population + 5;
                          return (
                            <TableRow key={cls.id}>
                              <TableCell className="font-bold">{cls.name}</TableCell>
                              <TableCell>{cls.population}</TableCell>
                              <TableCell>{cls.population + 5}</TableCell>
                              <TableCell><Badge variant={isGenerated ? "default" : "outline"}>{tokens.length}</Badge></TableCell>
                              <TableCell className="text-right flex justify-end gap-2">
                                <Button size="sm" variant="outline" onClick={() => generateTokens(cls)} disabled={isGenerated}>Generate Tokens</Button>
                                <Button size="sm" variant="outline" onClick={() => exportTokens(cls)} disabled={tokens.length === 0}><Download className="w-4 h-4" /></Button>
                                <Button size="sm" variant="ghost" onClick={() => deleteItem('classes', cls.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="overview" className="space-y-8 m-0">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Live Votes', val: stats.totalVotes, sub: `${stats.turnout}% Turnout`, color: 'text-primary' },
                  { label: 'Active Classes', val: stats.totalClasses, sub: 'Registered Groups', color: 'text-secondary' },
                  { label: 'Eligible Students', val: stats.totalStudents, sub: 'Total Population', color: 'text-secondary' },
                  { label: 'Electoral Roles', val: stats.totalPositions, sub: 'Contested Seats', color: 'text-accent' }
                ].map((stat, i) => (
                  <Card key={i} className="border-none shadow-sm"><CardContent className="pt-6"><p className="text-xs font-black text-muted-foreground uppercase mb-1">{stat.label}</p><h3 className={`text-3xl font-headline font-black ${stat.color}`}>{stat.val}</h3><p className="text-xs text-muted-foreground mt-1">{stat.sub}</p></CardContent></Card>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-none shadow-md"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> Class Participation</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30"><TableRow><TableHead className="text-xs uppercase">Class</TableHead><TableHead className="text-xs uppercase">Progress</TableHead></TableRow></TableHeader>
                    <TableBody>{classes.map(cls => (<TableRow key={cls.id}><TableCell className="font-bold">{cls.name}</TableCell><TableCell><div className="flex items-center gap-3"><Progress value={cls.population > 0 ? ((cls.votes_cast || 0) / cls.population) * 100 : 0} className="h-2 flex-1" /><span className="text-xs font-bold">{cls.population > 0 ? Math.round(((cls.votes_cast || 0) / cls.population) * 100) : 0}%</span></div></TableCell></TableRow>))}</TableBody>
                  </Table>
                </CardContent>
                </Card>
                <Card className="border-none shadow-md"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" /> Activity Feed</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {recentVotes.length === 0 ? (<p className="text-sm text-center text-muted-foreground py-10 italic">Awaiting votes...</p>) : (recentVotes.map((vote, i) => (<div key={i} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl"><div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="font-bold text-sm">{classes.find(c => c.id === vote.class_id)?.name || 'Class'}</span></div><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Vote Cast</span></div>)))}
                </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-8 m-0">
              <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-headline font-black text-secondary uppercase">AI Strategic Insights</h2><p className="text-muted-foreground">Real-time trends analysis and turnout predictions</p></div>
                <Button onClick={runAiAnalysis} disabled={isAnalyzing} className="bg-primary hover:bg-primary/90">{isAnalyzing ? <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}Generate Analysis</Button>
              </div>
              {aiInsight ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card className="border-none shadow-md"><CardHeader><CardTitle className="text-lg">Turnout Prediction</CardTitle></CardHeader><CardContent><div className="text-center py-6"><span className="text-6xl font-black text-primary">{aiInsight.predictedFinalTurnoutPercentage}%</span><p className="text-sm text-muted-foreground mt-2">Predicted Final Participation</p></div></CardContent></Card>
                  <Card className="border-none shadow-md"><CardHeader><CardTitle className="text-lg">Summary Analysis</CardTitle></CardHeader><CardContent><p className="text-sm leading-relaxed text-muted-foreground">{aiInsight.summaryAnalysis}</p></CardContent></Card>
                  <Card className="md:col-span-2 border-none shadow-md"><CardHeader><CardTitle className="text-lg">Voter Engagement Strategies</CardTitle></CardHeader><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">{aiInsight.engagementStrategies.map((strategy, i) => (<div key={i} className="flex gap-4 p-4 border rounded-xl hover:bg-accent/5 transition-colors"><div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">{i + 1}</div><p className="text-sm font-medium">{strategy}</p></div>))}</CardContent></Card>
                </div>
              ) : (<div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed"><BrainCircuit className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" /><p className="text-muted-foreground font-medium">Click "Generate Analysis" to run the AI engine.</p></div>)}
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
