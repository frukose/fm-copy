
import React, { useState, useEffect, useRef } from 'react';
import { Team, Player, MatchResult, Mentality, Objective, LeagueTeam, LeagueTier, PlayerRole, Position, TrainingFocus, MatchEvent, Financials, Tactics } from './types';
import { INITIAL_SQUAD, OPPONENTS } from './constants';
import { PlayerCard } from './components/PlayerCard';
import { simulateMatchWithAI, generateAcademyProspect, generateTransferMarket } from './services/geminiService';

const STORAGE_KEY = 'gemini_fm_save_v5';
const SEASON_LENGTH = 38; 

const INITIAL_LEAGUE: LeagueTeam[] = [
  ...OPPONENTS.slice(0, 17).map(name => ({ name, tier: 1 as LeagueTier, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 })),
  ...OPPONENTS.slice(17).map(name => ({ name, tier: 2 as LeagueTier, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 }))
];

const INITIAL_OBJECTIVES: Objective[] = [
  { id: '1', title: 'Season Target', description: 'Reach the boards performance goals.', target: 4, current: 0, reward: 15000000, completed: false, type: 'WINS' },
  { id: '2', title: 'Financial Stability', description: 'Avoid FFP sanctions.', target: 0, current: 0, reward: 5000000, completed: false, type: 'STADIUM_EXPANSION' }
];

const App: React.FC = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [isSacked, setIsSacked] = useState(false);
  const [isUnemployed, setIsUnemployed] = useState(false);
  const [showCrisisTalk, setShowCrisisTalk] = useState(false);
  const [hasPledged, setHasPledged] = useState(false);
  const [negotiatingPlayer, setNegotiatingPlayer] = useState<Player | null>(null);
  const [availableJobs, setAvailableJobs] = useState<{teamName: string, tier: LeagueTier, salary: number}[]>([]);
  const [leagueStandings, setLeagueStandings] = useState<LeagueTeam[]>(INITIAL_LEAGUE);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Never');
  
  const [team, setTeam] = useState<Team>({
    id: 'user-team',
    name: 'Gemini FC',
    managerName: 'Gaffer',
    players: INITIAL_SQUAD,
    funds: 55000000,
    wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0,
    academyLevel: 1,
    tier: 2,
    matchday: 0,
    stadium: { name: 'Gemini Arena', capacity: 25000, facilityLevel: 1, aestheticLevel: 1 },
    tactics: { 
      formation: '4-3-3', 
      mentality: 'Balanced', 
      focus: 'Mixed', 
      roleAssignments: {},
      startingXI: INITIAL_SQUAD.slice(0, 11).map(p => p.id) 
    },
    objectives: INITIAL_OBJECTIVES,
    jobSecurity: 80,
    managerSalary: 50000,
    managerContractYears: 3,
    financials: { revenue: 0, expenditure: 0, transferSpend: 0, wageBill: 0, ffpStatus: 'Healthy' }
  });

  const [activeTab, setActiveTab] = useState<'office' | 'squad' | 'transfers' | 'tactics' | 'table' | 'match'>('office');
  const [simulating, setSimulating] = useState(false);
  const [lastMatch, setLastMatch] = useState<MatchResult | null>(null);
  const [transferList, setTransferList] = useState<Player[]>([]);
  const [loadingTransfers, setLoadingTransfers] = useState(false);

  const [matchClock, setMatchClock] = useState(0);
  const [matchEvents, setMatchEvents] = useState<MatchEvent[]>([]);
  const [liveScore, setLiveScore] = useState({ home: 0, away: 0 });
  const [matchSpeed, setMatchSpeed] = useState(1);
  const matchIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setTeam(parsed.team);
        setLeagueStandings(parsed.leagueStandings);
        setIsUnemployed(parsed.isUnemployed || false);
        setHasPledged(parsed.hasPledged || false);
        setIsStarted(true);
        setLastSavedTime(new Date().toLocaleTimeString());
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    if (isStarted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ team, leagueStandings, isUnemployed, hasPledged }));
    }
  }, [team, leagueStandings, isStarted, isUnemployed, hasPledged]);

  useEffect(() => {
    if (isUnemployed) {
      const jobs = [
        { teamName: OPPONENTS[Math.floor(Math.random() * 10)], tier: 1 as LeagueTier, salary: 120000 },
        { teamName: OPPONENTS[10 + Math.floor(Math.random() * 10)], tier: 1 as LeagueTier, salary: 85000 },
        { teamName: OPPONENTS[20 + Math.floor(Math.random() * 10)], tier: 2 as LeagueTier, salary: 45000 },
        { teamName: OPPONENTS[30 + Math.floor(Math.random() * 10)], tier: 2 as LeagueTier, salary: 30000 },
      ];
      setAvailableJobs(jobs);
    }
  }, [isUnemployed]);

  const manualSave = () => {
    setSaveStatus('saving');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ team, leagueStandings, isUnemployed, hasPledged }));
    setTimeout(() => {
      setSaveStatus('saved');
      setLastSavedTime(new Date().toLocaleTimeString());
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 800);
  };

  const handlePledge = () => {
    setTeam(prev => ({ ...prev, jobSecurity: 35 }));
    setHasPledged(true);
    setShowCrisisTalk(false);
  };

  const handleResign = () => {
    setIsUnemployed(true);
    setShowCrisisTalk(false);
  };

  const acceptJob = (job: { teamName: string, tier: LeagueTier, salary: number }) => {
    setTeam(prev => ({
      ...prev,
      name: job.teamName,
      tier: job.tier,
      managerSalary: job.salary,
      jobSecurity: 80,
      matchday: 0,
      wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0,
      financials: { revenue: 0, expenditure: 0, transferSpend: 0, wageBill: 0, ffpStatus: 'Healthy' }
    }));
    setIsUnemployed(false);
    setIsSacked(false);
    setHasPledged(false);
    setActiveTab('office');
  };

  const renewContract = (player: Player) => {
    const increase = 1.15;
    const newSalary = Math.floor(player.salary * increase);
    const renewalFee = newSalary * 4;

    if (team.funds < renewalFee) {
      alert("Not enough funds for the signing bonus.");
      return;
    }

    setTeam(prev => ({
      ...prev,
      funds: prev.funds - renewalFee,
      players: prev.players.map(p => p.id === player.id ? { ...p, salary: newSalary, contractYears: 4 } : p)
    }));
    setNegotiatingPlayer(null);
    alert(`${player.name} signed a new 4-year deal!`);
  };

  const handleSeasonEnd = () => {
    alert("Season finished! Contracts aged, stats reset.");
    setTeam(prev => ({
      ...prev,
      matchday: 0,
      wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0,
      players: prev.players
        .map(p => ({ ...p, contractYears: p.contractYears - 1 }))
        .filter(p => p.contractYears > 0), 
      funds: prev.funds + 20000000 
    }));
    setLeagueStandings(prev => prev.map(t => ({ ...t, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 })));
  };

  const sortedStandings = (tier: LeagueTier) => {
    const allInTier = [...leagueStandings.filter(t => t.tier === tier)];
    if (!isUnemployed && team.tier === tier) {
        const userRow = {
            name: team.name,
            tier: team.tier,
            played: team.wins + team.draws + team.losses,
            wins: team.wins,
            draws: team.draws,
            losses: team.losses,
            gf: team.goalsFor,
            ga: team.goalsAgainst,
            points: (team.wins * 3) + team.draws - (team.pointDeduction || 0)
        };
        const idx = allInTier.findIndex(t => t.name === team.name);
        if (idx !== -1) allInTier[idx] = userRow;
        else allInTier.push(userRow);
    }
    return allInTier.sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));
  };

  const startLiveMatch = async () => {
    if (team.matchday >= SEASON_LENGTH) { handleSeasonEnd(); return; }
    setSimulating(true);
    setActiveTab('match');
    setMatchClock(0);
    setMatchEvents([]);
    setLiveScore({ home: 0, away: 0 });

    const opponents = leagueStandings.filter(t => t.tier === team.tier && t.name !== team.name);
    const opponent = opponents[Math.floor(Math.random() * opponents.length)];
    try {
      const result = await simulateMatchWithAI(team, opponent.name, team.tier === 1 ? 84 : 74);
      setLastMatch(result);
      let currentMinute = 0;
      matchIntervalRef.current = window.setInterval(() => {
        currentMinute += 1;
        setMatchClock(currentMinute);
        result.events.filter(e => e.minute === currentMinute).forEach(e => {
          setMatchEvents(prev => [e, ...prev]);
          if (e.type === 'GOAL') setLiveScore(prev => e.teamId === 'home' ? { ...prev, home: prev.home + 1 } : { ...prev, away: prev.away + 1 });
        });
        if (currentMinute >= 95) {
          clearInterval(matchIntervalRef.current!);
          finalizeMatch(result, opponent.name);
        }
      }, 1000 / matchSpeed);
    } catch (e) { setSimulating(false); }
  };

  const finalizeMatch = (result: MatchResult, opponentName: string) => {
    const weeklyWages = team.players.reduce((sum, p) => sum + p.salary, 0) + team.managerSalary;
    const matchRevenue = result.revenue;
    const outcome = result.homeScore > result.awayScore ? 'W' : (result.homeScore === result.awayScore ? 'D' : 'L');
    
    let baseJobDelta = outcome === 'W' ? 4 : (outcome === 'L' ? -12 : 0);
    if (hasPledged && outcome === 'L') baseJobDelta *= 2;

    setTeam(prev => {
      const newSecurity = Math.max(0, prev.jobSecurity + baseJobDelta);
      if (newSecurity < 20 && !showCrisisTalk && !hasPledged && !isSacked) {
         setShowCrisisTalk(true);
      } else if (newSecurity <= 0) {
         setIsSacked(true);
      }
      
      const updatedPlayers = prev.players.map(p => {
        const rating = result.playerRatings[p.id];
        if (!rating) return { ...p, fitness: Math.min(100, p.fitness + 5) };

        const newHistory = [...p.matchHistory, rating];
        const newStats = {
            ...p.stats,
            appearances: p.stats.appearances + 1,
            avgRating: (p.stats.avgRating * p.stats.appearances + rating) / (p.stats.appearances + 1)
        };

        return { 
          ...p, 
          fitness: Math.max(50, p.fitness - 12),
          form: Math.max(1, Math.min(10, (p.form + rating / 5) / 2)),
          matchHistory: newHistory,
          stats: newStats
        };
      });

      return { 
        ...prev, 
        jobSecurity: newSecurity,
        matchday: prev.matchday + 1,
        goalsFor: prev.goalsFor + result.homeScore,
        goalsAgainst: prev.goalsAgainst + result.awayScore,
        funds: prev.funds + matchRevenue - weeklyWages,
        wins: prev.wins + (outcome === 'W' ? 1 : 0),
        draws: prev.draws + (outcome === 'D' ? 1 : 0),
        losses: prev.losses + (outcome === 'L' ? 1 : 0),
        players: updatedPlayers,
        financials: {
          ...prev.financials,
          revenue: prev.financials.revenue + matchRevenue,
          expenditure: prev.financials.expenditure + weeklyWages,
          wageBill: prev.financials.wageBill + weeklyWages
        }
      };
    });
    setSimulating(false);
  };

  const updateTactics = (update: Partial<Tactics>) => {
    setTeam(prev => ({ ...prev, tactics: { ...prev.tactics, ...update } }));
  };

  const getEventIcon = (type: string) => {
    switch (type) {
        case 'GOAL': return 'fa-futbol text-emerald-400';
        case 'YELLOW': return 'fa-square text-amber-400';
        case 'RED': return 'fa-square text-rose-500';
        case 'SAVE': return 'fa-hand-paper text-blue-400';
        case 'FOUL': return 'fa-whistle text-orange-400';
        case 'SHOT_OFF_TARGET': return 'fa-arrow-right text-slate-500';
        case 'WOODWORK': return 'fa-ruler-vertical text-amber-600';
        default: return 'fa-comment text-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 font-sans">
      <header className={`sticky top-0 z-50 transition-colors duration-500 border-b p-4 ${team.jobSecurity < 25 ? 'bg-rose-950/80 border-rose-800 animate-pulse' : 'bg-slate-900/80 border-slate-800 backdrop-blur-md'}`}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${team.jobSecurity > 60 ? 'bg-emerald-500' : team.jobSecurity > 30 ? 'bg-amber-500' : 'bg-rose-500'} shadow-lg`} />
            <div>
              <h1 className="text-lg font-bold">{team.name} <span className="text-[10px] bg-blue-600 px-1.5 py-0.5 rounded ml-2 uppercase">Tier {team.tier}</span></h1>
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">Match {team.matchday}/{SEASON_LENGTH} • Security: {team.jobSecurity}%</p>
            </div>
          </div>
          <div className="flex gap-4 items-center">
             <div className="flex flex-col items-end">
                <p className={`font-mono font-bold ${team.funds < 0 ? 'text-rose-500' : 'text-emerald-400'}`}>£{(team.funds / 1000000).toFixed(1)}M</p>
             </div>
             <button onClick={startLiveMatch} disabled={simulating} className="bg-blue-600 px-6 py-2 rounded-full font-bold text-sm hover:bg-blue-500 shadow-lg shadow-blue-900/20 active:scale-95 transition-transform">
                {simulating ? `LIVE: ${matchClock}'` : team.matchday >= SEASON_LENGTH ? "Finish Season" : "Play Match"}
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {!simulating && (
            <nav className="flex gap-8 mb-8 border-b border-slate-800 overflow-x-auto whitespace-nowrap pb-4 scrollbar-hide">
            {['office', 'squad', 'transfers', 'tactics', 'table'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-blue-400 border-b border-blue-400 pb-4 -mb-4' : 'text-slate-500 hover:text-slate-300'}`}>
                {tab}
                </button>
            ))}
            </nav>
        )}

        {activeTab === 'office' && !simulating && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-slate-900 rounded-[40px] p-8 border border-slate-800 shadow-xl">
                <div className="flex justify-between items-start mb-10">
                  <h2 className="text-3xl font-black uppercase tracking-tighter">Executive Suite</h2>
                  <button onClick={manualSave} disabled={saveStatus !== 'idle'} className="px-6 py-2 rounded-xl text-[10px] font-black uppercase bg-white text-black hover:bg-slate-200 transition-colors">
                    {saveStatus === 'saved' ? 'Saved' : 'Save Session'}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-10">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Weekly Expenses</p>
                    <p className="text-2xl font-black">£{(team.players.reduce((s, p) => s + p.salary, 0) / 1000).toFixed(0)}k</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Board Trust</p>
                    <p className="text-2xl font-black">{team.jobSecurity}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Squad Morale</p>
                    <p className="text-2xl font-black text-emerald-400">High</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 rounded-[40px] p-8 border border-slate-800">
                <h3 className="text-xs font-black uppercase text-slate-500 mb-6 tracking-widest">Urgent: Contracts</h3>
                <div className="space-y-3">
                   {team.players.filter(p => p.contractYears <= 1).map(p => (
                     <div key={p.id} className="flex items-center justify-between p-4 bg-slate-950 border border-rose-500/20 rounded-2xl">
                        <div>
                          <p className="font-bold text-sm">{p.name} <span className="text-[10px] text-rose-500 font-black ml-2 uppercase italic">{p.contractYears === 0 ? 'EXPIRED' : 'FINAL YEAR'}</span></p>
                        </div>
                        <button onClick={() => setNegotiatingPlayer(p)} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-900/40">Negotiate</button>
                     </div>
                   ))}
                   {team.players.filter(p => p.contractYears <= 1).length === 0 && <p className="text-slate-600 text-[10px] font-black uppercase">Contracts are under control.</p>}
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[40px] p-8 border border-slate-800">
               <h3 className="text-xs font-black uppercase text-slate-500 mb-6 tracking-widest">Finance Portal</h3>
               <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold uppercase">Revenue</span>
                    <span className="text-emerald-400 font-mono font-black">£{(team.financials.revenue/1000000).toFixed(1)}M</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold uppercase">Wages</span>
                    <span className="text-rose-400 font-mono font-black">£{(team.financials.wageBill/1000000).toFixed(1)}M</span>
                  </div>
                  <div className="h-[1px] bg-slate-800" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold uppercase">Balance</span>
                    <span className={`font-mono font-black ${team.funds > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      £{(team.funds/1000000).toFixed(1)}M
                    </span>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'squad' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {team.players.map(player => (
              <PlayerCard 
                key={player.id} 
                player={player} 
                assignedRole={team.tactics.roleAssignments[player.id]} 
              />
            ))}
          </div>
        )}

        {activeTab === 'tactics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-slate-900 p-8 rounded-[48px] border border-slate-800">
                    <h3 className="text-2xl font-black uppercase mb-8 tracking-tighter">Tactical Board</h3>
                    <div className="pitch aspect-[4/5] rounded-3xl mb-8 overflow-hidden relative shadow-2xl">
                        {/* Sample 4-3-3 Positioning Visual */}
                        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-12 h-12 bg-white/10 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-black uppercase">ATT</div>
                        <div className="absolute top-[20%] left-[20%] w-12 h-12 bg-white/10 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-black uppercase">LW</div>
                        <div className="absolute top-[20%] left-[80%] -translate-x-full w-12 h-12 bg-white/10 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-black uppercase">RW</div>
                        
                        <div className="absolute top-[50%] left-1/2 -translate-x-1/2 w-12 h-12 bg-white/10 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-black uppercase">CM</div>
                        <div className="absolute top-[55%] left-[25%] w-12 h-12 bg-white/10 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-black uppercase">LCM</div>
                        <div className="absolute top-[55%] left-[75%] -translate-x-full w-12 h-12 bg-white/10 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-black uppercase">RCM</div>

                        <div className="absolute bottom-[20%] left-[30%] w-12 h-12 bg-white/10 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-black uppercase">CB</div>
                        <div className="absolute bottom-[20%] left-[70%] -translate-x-full w-12 h-12 bg-white/10 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-black uppercase">CB</div>
                        <div className="absolute bottom-[25%] left-[10%] w-12 h-12 bg-white/10 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-black uppercase">LB</div>
                        <div className="absolute bottom-[25%] left-[90%] -translate-x-full w-12 h-12 bg-white/10 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-black uppercase">RB</div>
                        
                        <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 w-12 h-12 bg-amber-500/20 rounded-full border border-amber-500/40 flex items-center justify-center text-[8px] font-black uppercase">GK</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Mentality</label>
                            <select 
                                value={team.tactics.mentality}
                                onChange={(e) => updateTactics({ mentality: e.target.value as any })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold appearance-none outline-none focus:border-blue-500"
                            >
                                <option>Defensive</option>
                                <option>Balanced</option>
                                <option>Attacking</option>
                                <option>Gung-Ho</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Focus</label>
                            <select 
                                value={team.tactics.focus}
                                onChange={(e) => updateTactics({ focus: e.target.value as any })}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold appearance-none outline-none focus:border-blue-500"
                            >
                                <option>Mixed</option>
                                <option>Wings</option>
                                <option>Central</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[48px] border border-slate-800">
                    <h3 className="text-xs font-black uppercase text-slate-500 mb-6 tracking-widest">Role Assignments</h3>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                        {team.players.slice(0, 11).map(p => (
                            <div key={p.id} className="bg-slate-950 p-4 rounded-3xl border border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${p.position === 'GK' ? 'bg-amber-500/20 text-amber-500' : p.position === 'ATT' ? 'bg-rose-500/20 text-rose-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                        {p.position}
                                    </div>
                                    <span className="font-bold text-sm">{p.name}</span>
                                </div>
                                <select 
                                    value={team.tactics.roleAssignments[p.id] || 'Standard'}
                                    onChange={(e) => {
                                        const newRoles = { ...team.tactics.roleAssignments, [p.id]: e.target.value as any };
                                        updateTactics({ roleAssignments: newRoles });
                                    }}
                                    className="bg-slate-900 border-none text-[10px] font-black uppercase px-4 py-2 rounded-xl outline-none text-blue-400"
                                >
                                    {p.position === 'GK' && <option>Sweeper Keeper</option>}
                                    {p.position === 'DEF' && <><option>No-Nonsense</option><option>Ball Playing</option></>}
                                    {p.position === 'MID' && <><option>Playmaker</option><option>Box-to-Box</option><option>Ball Winner</option></>}
                                    {p.position === 'ATT' && <><option>Target Man</option><option>Poacher</option><option>False Nine</option></>}
                                    <option>Standard</option>
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'match' && (simulating || lastMatch) && (
           <div className="animate-in fade-in duration-500">
              <div className="bg-slate-900 p-10 rounded-[56px] border border-slate-800 shadow-2xl mb-8">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-8 text-center">
                    <div className="flex-1">
                        <h2 className="text-xl font-black uppercase text-slate-400 mb-2">{team.name}</h2>
                        <p className="text-8xl font-black text-white">{liveScore.home}</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="text-blue-500 font-black text-4xl mb-2">{simulating ? `${matchClock}'` : 'FT'}</div>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-black uppercase text-slate-400 mb-2">{lastMatch?.awayTeam}</h2>
                        <p className="text-8xl font-black text-white">{liveScore.away}</p>
                    </div>
                  </div>
                  {!simulating && lastMatch && (
                    <div className="mb-8 p-6 bg-blue-600/10 border border-blue-500/20 rounded-3xl text-sm italic text-blue-100 text-center leading-relaxed">
                        "{lastMatch.summary}"
                    </div>
                  )}
                  <div className="bg-slate-950 p-8 rounded-[40px] border border-white/5 h-[350px] overflow-y-auto custom-scrollbar flex flex-col-reverse gap-4">
                    {matchEvents.map((e, i) => (
                        <div key={i} className={`p-4 rounded-2xl border flex items-center gap-4 animate-in slide-in-from-right duration-500 bg-white/[0.02] border-white/5 ${e.type === 'GOAL' ? 'bg-emerald-500/10 border-emerald-500/30' : ''}`}>
                            <span className="font-black text-xs text-blue-400 w-8">{e.minute}'</span>
                            <i className={`fas ${getEventIcon(e.type)} text-lg w-6 text-center`}></i>
                            <span className="font-bold uppercase text-[10px] tracking-tight">{e.description}</span>
                        </div>
                    ))}
                  </div>
              </div>
           </div>
        )}

        {/* Transfers & Table remain consistent with previous implementation */}
        {activeTab === 'table' && (
          <div className="space-y-3 animate-in fade-in">
            {sortedStandings(team.tier).map((row, idx) => (
               <div key={row.name} className={`flex items-center justify-between px-6 py-5 rounded-3xl border transition-colors ${row.name === team.name ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-900 border-slate-800 shadow-lg'}`}>
                  <div className="flex items-center gap-6">
                    <span className="font-black w-8 text-center text-lg">{idx + 1}</span>
                    <span className="font-black text-sm uppercase">{row.name}</span>
                  </div>
                  <div className="flex gap-12 font-mono text-xs">
                    <span className="w-10 text-center text-slate-400">{row.played}</span>
                    <span className="w-10 text-center text-slate-400">{row.gf - row.ga}</span>
                    <span className="w-10 text-center font-black">{row.points}</span>
                  </div>
               </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
