
"use client";

import { useState, useMemo } from 'react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, doc, setDoc, updateDoc, increment, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2, Trash2, Power, Settings, Users, UserPlus, LayoutDashboard, BrainCircuit, Key, Download } from 'lucide-react';
import Image from 'next/image';
import { SidebarProvider, Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Class, Candidate, Position, VoterToken } from '@/lib/types';

export default function AdminPage() {
  const db = useFirestore();
  const { data: classes = [] } = useCollection<Class>(collection(db!, 'classes'));
  const { data: positions = [] } = useCollection<Position>(collection(db!, 'positions'));
  const { data: candidates = [] } = useCollection<Candidate>(collection(db!, 'candidates'));
  const { data: allTokens = [] } = useCollection<VoterToken>(collection(db!, 'voter_tokens'));

  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

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

  const generateTokens = (cls: Class) => {
    const count = cls.population + 5;
    const existingTokens = allTokens.filter(t => t.class_id === cls.id);
    
    if (existingTokens.length >= count) {
      alert("Tokens already generated for this class.");
      return;
    }

    const newTokensNeeded = count - existingTokens.length;
    for (let i = 0; i < newTokensNeeded; i++) {
      const tokenId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const tokenRef = doc(db!, 'voter_tokens', tokenId);
      setDoc(tokenRef, {
        id: tokenId,
        class_id: cls.id,
        status: 'unused'
      });
    }
    alert(`${newTokensNeeded} tokens generated for ${cls.name}`);
  };

  const exportTokens = (cls: Class) => {
    const tokens = allTokens.filter(t => t.class_id === cls.id);
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Token,Status\n" 
      + tokens.map(e => `${e.id},${e.status}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tokens_${cls.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <SidebarProvider>
      <Sidebar className="bg-secondary text-white border-none">
        <SidebarHeader className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg">
              <Power className="w-5 h-5" />
            </div>
            <h2 className="font-headline font-black text-xl tracking-tight uppercase">Sovereign Admin</h2>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveTab('overview')} isActive={activeTab === 'overview'} className="hover:bg-white/10 h-12 text-white data-[active=true]:bg-primary">
                <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveTab('tokens')} isActive={activeTab === 'tokens'} className="hover:bg-white/10 h-12 text-white data-[active=true]:bg-primary">
                <Key className="w-5 h-5 mr-3" /> Voter Tokens
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveTab('candidates')} isActive={activeTab === 'candidates'} className="hover:bg-white/10 h-12 text-white data-[active=true]:bg-primary">
                <UserPlus className="w-5 h-5 mr-3" /> Candidates
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setActiveTab('classes')} isActive={activeTab === 'classes'} className="hover:bg-white/10 h-12 text-white data-[active=true]:bg-primary">
                <Users className="w-5 h-5 mr-3" /> Classes
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="bg-[#F5F5F5]">
        <header className="h-20 border-b bg-white flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-xl font-headline font-black text-secondary uppercase tracking-tight">Electoral Management</h1>
          </div>
        </header>

        <main className="p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
            <TabsContent value="overview" className="space-y-8 m-0">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-none shadow-sm">
                  <CardContent className="pt-6">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Total Votes</p>
                    <h3 className="text-3xl font-headline font-black text-primary">{stats.totalVotes}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{stats.turnout}% Turnout</p>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                  <CardContent className="pt-6">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Total Classes</p>
                    <h3 className="text-3xl font-headline font-black text-secondary">{stats.totalClasses}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Registered Groups</p>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                  <CardContent className="pt-6">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Eligible Students</p>
                    <h3 className="text-3xl font-headline font-black text-secondary">{stats.totalStudents}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Projected Population</p>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                  <CardContent className="pt-6">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Active Positions</p>
                    <h3 className="text-3xl font-headline font-black text-accent">{stats.totalPositions}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Electoral Contests</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-none shadow-md overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg">Class Voting Progress</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="font-bold text-xs uppercase">Class</TableHead>
                          <TableHead className="font-bold text-xs uppercase">Turnout</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classes.map(cls => (
                          <TableRow key={cls.id}>
                            <TableCell className="font-bold">{cls.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary" style={{ width: `${((cls.votes_cast || 0) / cls.population) * 100}%` }} />
                                </div>
                                <span className="text-xs font-bold">{Math.round(((cls.votes_cast || 0) / cls.population) * 100)}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tokens" className="space-y-8 m-0">
              <header className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-headline font-black text-secondary uppercase">Voter Tokens</h2>
                  <p className="text-muted-foreground">Manage and export unique IDs for each student</p>
                </div>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes.map(cls => (
                  <Card key={cls.id} className="border-none shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-md flex justify-between items-center">
                        {cls.name}
                        <Badge variant="outline">{allTokens.filter(t => t.class_id === cls.id).length} Generated</Badge>
                      </CardTitle>
                      <CardDescription>Pop: {cls.population} | Min Tokens: {cls.population + 5}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                      <Button className="flex-1" variant="secondary" onClick={() => generateTokens(cls)}>Generate</Button>
                      <Button className="flex-1" variant="outline" onClick={() => exportTokens(cls)}>
                        <Download className="w-4 h-4 mr-2" /> Export
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedClassId && (
                <Card className="border-none shadow-md mt-8">
                  <CardHeader>
                    <CardTitle>Token List</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {allTokens.filter(t => t.class_id === selectedClassId).map(t => (
                        <div key={t.id} className={`p-2 border rounded text-center text-xs font-bold ${t.status === 'used' ? 'bg-muted text-muted-foreground' : 'bg-white'}`}>
                          {t.id}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
