"use client";

import { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Plus, UserPlus, LayoutDashboard, BrainCircuit, Download, Activity,
  Sparkles, RefreshCcw, Trash2, CheckCircle2, Lock, Settings2, Users,
  MonitorPlay, Timer, Key, Mail, ShieldAlert, Loader2, Upload, ImageIcon
} from 'lucide-react';
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger, SidebarSeparator
} from '@/components/ui/sidebar';
import { Class, Candidate, Position, VoterToken, SystemConfig } from '@/lib/types';
import { realtimeElectionInsightGeneration, RealtimeElectionInsightGenerationOutput } from '@/ai/flows/realtime-election-insight-generation';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

export default function AdminPage() {
  const supabase = createClient();
  const { toast } = useToast();

  // ─── Auth State ────────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authStep, setAuthStep] = useState<'email' | 'code'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const ADMIN_EMAIL = 'amoakoafrifa741@gmail.com';

  // ─── Data State ────────────────────────────────────────────────────────────
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

  // ─── Form State ────────────────────────────────────────────────────────────
  const [newPosition, setNewPosition] = useState('');
  const [newCandidate, setNewCandidate] = useState({ name: '', positionId: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', population: 0 });

  // ─── Check existing session ────────────────────────────────────────────────
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email === ADMIN_EMAIL) {
        setIsAuthenticated(true);
      }
    };
    checkUser();
  }, [supabase.auth]);

  // ─── Auth handlers ─────────────────────────────────────────────────────────
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
        options: { shouldCreateUser: false },
      });
      if (error) {
        if (error.message.includes('Signups not allowed')) {
          throw new Error('Admin account not found. Please add the user manually in Supabase dashboard.');
        }
        throw error;
      }
      setAuthStep('code');
      toast({ title: "Verification Sent", description: "A 6-digit code has been sent to your email." });
    } catch (err: any) {
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
      setAuthError('Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Fetch all data ────────────────────────────────────────────────────────
  const fetchData = async () => {
    try {
      const [cls, pos, cand, tokens, cfg, recent] = await Promise.all([
        supabase.from('classes').select('*').order('name'),
        supabase.from('positions').select('*').order('order_index'),
        supabase.from('candidates').select('*'),
        supabase.from('voter_tokens').select('*'),
        supabase.from('system_config').select('*').eq('id', 'election_status').maybeSingle(),
        supabase.from('voter_tokens').select('*').eq('status', 'used').order('used_at', { ascending: false }).limit(10),
      ]);

      if (cls.data) setClasses(cls.data);
      if (pos.data) setPositions(pos.data);
      if (cand.data) setCandidates(cand.data);
      if (tokens.data) setAllTokens(tokens.data);
      if (cfg.data) setConfig(cfg.data);
      if (recent.data) setRecentVotes(recent.data);
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

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, supabase]);

  // ─── Elapsed timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!config?.is_open || !config?.opened_at) {
      setElapsedTime("00:00:00");
      return;
    }
    const interval = setInterval(() => {
      const diff = Math.max(0, Date.now() - new Date(config.opened_at!).getTime());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setElapsedTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [config?.is_open, config?.opened_at]);

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalStudents = classes.reduce((acc, c) => acc + c.population, 0);
    const totalVotes = classes.reduce((acc, c) => acc + (c.votes_cast || 0), 0);
    return {
      totalVotes,
      totalStudents,
      totalClasses: classes.length,
      totalPositions: positions.length,
      turnout: totalStudents > 0 ? Math.round((totalVotes / totalStudents) * 100) : 0,
    };
  }, [classes, positions]);

  // ─── Election toggle ──────────────────────────────────────────────────────
  const toggleElection = async () => {
    const newStatus = !config?.is_open;
    const { error } = await supabase.from('system_config').upsert(
      { id: 'election_status', is_open: newStatus, opened_at: newStatus ? new Date().toISOString() : null },
      { onConflict: 'id' }
    );
    if (error) {
      toast({ title: "Operation Failed", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: newStatus ? "Election Opened" : "Polls Closed",
        description: newStatus ? "Students can now cast their votes." : "Voting has been disabled.",
      });
      fetchData();
    }
  };

  // ─── Add position ─────────────────────────────────────────────────────────
  const handleAddPosition = async () => {
    if (!newPosition.trim()) return;
    const { error } = await supabase.from('positions').insert({
      name: newPosition.trim(),
      order_index: positions.length,
    });
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      setNewPosition('');
      fetchData();
      toast({ title: "Position added", description: `"${newPosition.trim()}" is now available.` });
    }
  };

  // ─── File picker handler ───────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  };

  // ─── Add candidate (with image upload) ────────────────────────────────────
  const handleAddCandidate = async () => {
    if (!newCandidate.name.trim() || !newCandidate.positionId || !selectedFile) {
      toast({
        title: "Incomplete form",
        description: "Please provide a name, position, and photo.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: selectedFile.type || 'image/jpeg',
        });

      if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase.from('candidates').insert({
        full_name: newCandidate.name.trim(),
        position_id: newCandidate.positionId,
        photo_url: publicUrl,
        votes: 0,
      });

      if (insertError) throw new Error(`Database insert failed: ${insertError.message}`);

      setNewCandidate({ name: '', positionId: '' });
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      const fileInput = document.getElementById('candidate-photo-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      fetchData();
      toast({ title: "Candidate registered", description: `${newCandidate.name.trim()} added successfully.` });
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Add class ────────────────────────────────────────────────────────────
  const handleAddClass = async () => {
    if (!newClass.name.trim() || newClass.population <= 0) return;
    const { error } = await supabase.from('classes').insert({
      name: newClass.name.trim(),
      population: newClass.population,
      votes_cast: 0,
    });
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      setNewClass({ name: '', population: 0 });
      fetchData();
      toast({ title: "Class added", description: `${newClass.name.trim()} registered.` });
    }
  };

  // ─── Generate tokens ──────────────────────────────────────────────────────
  const generateTokens = async (cls: Class) => {
    const count = cls.population + 5;
    const prefix = cls.name.replace(/\s+/g, '').toUpperCase().substring(0, 3);
    const tokensToInsert = Array.from({ length: count }, () => ({
      id: `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`,
      class_id: cls.id,
      status: 'unused',
    }));
    const { error } = await supabase.from('voter_tokens').insert(tokensToInsert);
    if (error) {
      toast({ title: "Token generation failed", description: error.message, variant: "destructive" });
    } else {
      fetchData();
      toast({ title: "Tokens generated", description: `${count} tokens created for ${cls.name}.` });
    }
  };

  // ─── Delete item ──────────────────────────────────────────────────────────
  const deleteItem = async (table: string, id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      fetchData();
    }
  };

  // ─── Export tokens CSV ────────────────────────────────────────────────────
  const exportTokens = (cls: Class) => {
    const tokens = allTokens.filter(t => t.class_id === cls.id);
    const csv = "Token,Status\n" + tokens.map(t => `${t.id},${t.status}`).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI("data:text/csv;charset=utf-8," + csv);
    link.download = `tokens_${cls.name.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── AI analysis ─────────────────────────────────────────────────────────
  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const hourMap: Record<number, number> = {};
      allTokens
        .filter(t => t.status === 'used' && t.used_at)
        .forEach(t => {
          const h = new Date(t.used_at!).getHours();
          hourMap[h] = (hourMap[h] || 0) + 1;
        });

      const result = await realtimeElectionInsightGeneration({
        totalEligibleVoters: stats.totalStudents,
        totalVotesCast: stats.totalVotes,
        votingTrendData: Object.entries(hourMap).map(([h, c]) => ({ hour: parseInt(h), votesInHour: c })),
        classVotingProgress: classes.map(c => ({ className: c.name, population: c.population, votesCast: c.votes_cast || 0 })),
        electionStatus: config?.is_open ? 'open' : 'closed',
      });

      setAiInsight(result);
    } catch (error) {
      console.error("AI analysis failed:", error);
      toast({ title: "AI analysis failed", description: "Please check your GEMINI_API_KEY.", variant: "destructive" });
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
            <CardDescription className="font-medium">Secure verification required</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {authStep === 'email' ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Administrator Email</label>
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
                <Button className="w-full h-12 bg-primary font-bold" onClick={handleEmailAuth} disabled={isLoading || !emailInput}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Verification Code</label>
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
                <Button className="w-full h-12 bg-primary font-bold" onClick={handleCodeAuth} disabled={isLoading || !codeInput}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Access"}
                </Button>
              </div>
            )}
          </CardContent>
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
            <h2 className="font-headline font-black text-xl tracking-tight uppercase">CIS Admin</h2>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-4">
          <SidebarMenu>
            {[
              { tab: 'onboarding', icon: Settings2, label: 'System Setup' },
              { tab: 'overview', icon: LayoutDashboard, label: 'Dashboard' },
              { tab: 'insights', icon: BrainCircuit, label: 'AI Insights' },
            ].map(({ tab, icon: Icon, label }) => (
              <SidebarMenuItem key={tab}>
                <SidebarMenuButton onClick={() => setActiveTab(tab)} isActive={activeTab === tab} className="hover:bg-white/10 h-12 text-white data-[active=true]:bg-primary">
                  <Icon className="w-5 h-5 mr-3" /> {label}
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
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
            <h1 className="text-xl font-headline font-black text-secondary uppercase tracking-tight">Control Center</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-1.5 bg-accent/10 text-accent rounded-full border border-accent/20">
              <Timer className="w-4 h-4" />
              <span className="font-mono font-bold text-sm">{elapsedTime}</span>
            </div>
            <Badge variant={config?.is_open ? "default" : "secondary"} className={config?.is_open ? "bg-emerald-500" : ""}>{config?.is_open ? "POLLS OPEN" : "POLLS CLOSED"}</Badge>
            <Button size="sm" variant={config?.is_open ? "destructive" : "default"} onClick={toggleElection}>
              {config?.is_open ? <><Lock className="w-4 h-4 mr-2" /> Close Polls</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Open Election</>}
            </Button>
          </div>
        </header>

        <main className="p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsContent value="onboarding" className="space-y-8 m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="border-none shadow-md">
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Plus className="w-5 h-5" /> 1. Define Positions</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <Input placeholder="e.g., Head Prefect" value={newPosition} onChange={e => setNewPosition(e.target.value)} />
                      <Button onClick={handleAddPosition} disabled={!newPosition.trim()}>Add</Button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {positions.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-3 bg-muted rounded-xl">
                          <span className="font-bold text-sm">{p.name}</span>
                          <Button variant="ghost" size="sm" onClick={() => deleteItem('positions', p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md">
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><UserPlus className="w-5 h-5" /> 2. Register Candidates</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <Input placeholder="Candidate Full Name" value={newCandidate.name} onChange={e => setNewCandidate({ ...newCandidate, name: e.target.value })} />
                    <select className="w-full h-10 px-3 rounded-md border text-sm bg-background" value={newCandidate.positionId} onChange={e => setNewCandidate({ ...newCandidate, positionId: e.target.value })}>
                      <option value="">Select Position</option>
                      {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="space-y-2">
                      <label htmlFor="candidate-photo-input" className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer hover:bg-muted/50 transition-colors">
                        {previewUrl ? <img src={previewUrl} alt="Preview" className="w-20 h-20 rounded-xl object-cover border" /> : <ImageIcon className="w-8 h-8 text-muted-foreground" />}
                        <p className="text-xs font-medium text-muted-foreground">{selectedFile ? selectedFile.name : "Select Photo"}</p>
                      </label>
                      <input id="candidate-photo-input" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </div>
                    <Button className="w-full h-12 font-bold" onClick={handleAddCandidate} disabled={isUploading || !newCandidate.name.trim() || !newCandidate.positionId || !selectedFile}>
                      {isUploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />} Register
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-md md:col-span-2">
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" /> 3. Class Management</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input placeholder="Class Name" value={newClass.name} onChange={e => setNewClass({ ...newClass, name: e.target.value })} />
                      <Input type="number" placeholder="Population" value={newClass.population || ''} onChange={e => setNewClass({ ...newClass, population: parseInt(e.target.value) || 0 })} />
                      <Button onClick={handleAddClass} disabled={!newClass.name.trim() || newClass.population <= 0}>Add Class</Button>
                    </div>
                    <Table>
                      <TableHeader><TableRow><TableHead>Class</TableHead><TableHead>Population</TableHead><TableHead>Votes</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {classes.map(cls => (
                          <TableRow key={cls.id}>
                            <TableCell className="font-bold">{cls.name}</TableCell>
                            <TableCell>{cls.population}</TableCell>
                            <TableCell>{cls.votes_cast || 0}</TableCell>
                            <TableCell className="text-right flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => generateTokens(cls)}>Generate Tokens</Button>
                              <Button size="sm" variant="outline" onClick={() => exportTokens(cls)}><Download className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteItem('classes', cls.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="overview" className="space-y-8 m-0">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Live Votes', val: stats.totalVotes, color: 'text-primary' },
                  { label: 'Turnout', val: `${stats.turnout}%`, color: 'text-secondary' },
                  { label: 'Population', val: stats.totalStudents, color: 'text-secondary' },
                  { label: 'Roles', val: stats.totalPositions, color: 'text-accent' },
                ].map((stat, i) => (
                  <Card key={i} className="border-none shadow-sm"><CardContent className="pt-6"><p className="text-xs font-black text-muted-foreground uppercase mb-1">{stat.label}</p><h3 className={`text-3xl font-black ${stat.color}`}>{stat.val}</h3></CardContent></Card>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border-none shadow-md">
                  <CardHeader><CardTitle className="text-lg">Participation Progress</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableBody>
                        {classes.map(cls => {
                          const pct = cls.population > 0 ? Math.round(((cls.votes_cast || 0) / cls.population) * 100) : 0;
                          return (
                            <TableRow key={cls.id}><TableCell className="font-bold">{cls.name}</TableCell><TableCell className="w-full"><div className="flex items-center gap-3"><Progress value={pct} className="h-2 flex-1" /><span className="text-xs font-bold">{pct}%</span></div></TableCell></TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-md">
                  <CardHeader><CardTitle className="text-lg">Recent Activity</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {recentVotes.map((v, i) => (<div key={i} className="flex items-center justify-between p-3 bg-muted rounded-xl"><span className="text-sm font-bold">{classes.find(c => c.id === v.class_id)?.name}</span><Badge variant="outline">Vote Cast</Badge></div>))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="insights" className="space-y-8 m-0">
              <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-black text-secondary uppercase">Strategic Insights</h2></div>
                <Button onClick={runAiAnalysis} disabled={isAnalyzing} className="bg-primary">{isAnalyzing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />} Analyze</Button>
              </div>
              {aiInsight && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Card className="border-none shadow-md"><CardHeader><CardTitle>Predicted Turnout</CardTitle></CardHeader><CardContent><div className="text-center py-6 text-6xl font-black text-primary">{aiInsight.predictedFinalTurnoutPercentage}%</div></CardContent></Card>
                  <Card className="border-none shadow-md"><CardHeader><CardTitle>Analysis</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{aiInsight.summaryAnalysis}</p></CardContent></Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
