
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
  const [leagueStandings, setLeagueStandings] = useState<LeagueTeam[]>(INITIAL_LEAGUE);
  const [isRecruiting, setIsRecruiting] = useState(false);
  const [marketPlayers, setMarketPlayers] = useState<Player[]>([]);
  const [loadingMarket, setLoadingMarket] = useState(false);
  
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

  const [activeTab, setActiveTab] = useState<'office' | 'squad' | 'transfers' | 'tactics' | 'table' | 'match' | 'financials'>('office');
  const [simulating, setSimulating] = useState(false);
  const [lastMatch, setLastMatch] = useState<MatchResult | null>(null);
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
        if (parsed.team && parsed.leagueStandings) {
          setTeam(parsed.team);
          setLeagueStandings(parsed.leagueStandings);
          setIsStarted(true);
        }
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    if (isStarted) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ team, leagueStandings }));
    }
  }, [team, leagueStandings, isStarted]);

  const refreshMarket = async () => {
    setLoadingMarket(true);
    try {
      const avgRating = team.players.reduce((a, b) => a + b.rating, 0) / team.players.length;
      const players = await generateTransferMarket(avgRating);
      setMarketPlayers(players);
    } catch (e) { console.error(e); }
    finally { setLoadingMarket(false); }
  };

  const buyPlayer = (player: Player) => {
    if (team.funds < player.marketValue) {
      alert("Insufficient funds!");
      return;
    }
    setTeam(prev => ({
      ...prev,
      funds: prev.funds - player.marketValue,
      players: [...prev.players, player],
      financials: {
        ...prev.financials,
        transferSpend: prev.financials.transferSpend + player.marketValue,
        expenditure: prev.financials.expenditure + player.marketValue
      }
    }));
    setMarketPlayers(prev => prev.filter(p => p.id !== player.id));
    alert(`${player.name} has signed for ${team.name}!`);
  };

  const toggleStartingXI = (playerId: string) => {
    setTeam(prev => {
      const isStarting = prev.tactics.startingXI.includes(playerId);
      if (isStarting) {
        return {
          ...prev,
          tactics: { ...prev.tactics, startingXI: prev.tactics.startingXI.filter(id => id !== playerId) }
        };
      } else {
        if (prev.tactics.startingXI.length >= 11) {
          alert("Maximum 11 players in Starting XI!");
          return prev;
        }
        return {
          ...prev,
          tactics: { ...prev.tactics, startingXI: [...prev.tactics.startingXI, playerId] }
        };
      }
    });
  };

  const upgradeAcademy = () => {
    const upgradeCost = team.academyLevel * 5000000;
    if (team.funds < upgradeCost) {
      alert("Insufficient funds for Academy upgrade!");
      return;
    }
    if (team.academyLevel >= 5) {
      alert("Academy is already at world-class level!");
      return;
    }
    setTeam(prev => ({
      ...prev,
      funds: prev.funds - upgradeCost,
      academyLevel: prev.academyLevel + 1,
      financials: {
        ...prev.financials,
        expenditure: prev.financials.expenditure + upgradeCost
      }
    }));
    alert(`Academy upgraded to Level ${team.academyLevel + 1}!`);
  };

  const recruitFromAcademy = async () => {
    const fee = 500000;
    if (team.funds < fee) {
      alert("Not enough funds to recruit from academy.");
      return;
    }
    setIsRecruiting(true);
    try {
      const prospect = await generateAcademyProspect(team.academyLevel);
      setTeam(prev => ({
        ...prev,
        funds: prev.funds - fee,
        players: [...prev.players, prospect],
        financials: {
            ...prev.financials,
            expenditure: prev.financials.expenditure + fee
        }
      }));
      alert(`New talent found! ${prospect.name} (${prospect.position}) has joined the youth ranks.`);
      setActiveTab('squad');
    } catch (e) {
      console.error(e);
    } finally {
      setIsRecruiting(false);
    }
  };

  const startLiveMatch = async () => {
    if (team.tactics.startingXI.length !== 11) {
      alert("You must select exactly 11 players for your Starting XI!");
      setActiveTab('squad');
      return;
    }
    if (team.matchday >= SEASON_LENGTH) { alert("Season finished!"); return; }
    
    setSimulating(true);
    setActiveTab('match');
    setMatchClock(0);
    setMatchEvents([]);
    setLiveScore({ home: 0, away: 0 });

    const opponents = leagueStandings.filter(t => t.tier === team.tier && t.name !== team.name);
    const opponent = opponents[Math.floor(Math.random() * opponents.length)];
    
    const matchSquad = {
      ...team,
      players: team.players.filter(p => team.tactics.startingXI.includes(p.id))
    };

    try {
      const result = await simulateMatchWithAI(matchSquad, opponent.name, team.tier === 1 ? 84 : 74);
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
    const cleanSheet = result.awayScore === 0;
    const savesCount = result.events.filter(e => e.type === 'SAVE' && e.teamId === 'home').length;
    
    setTeam(prev => {
      const updatedPlayers = prev.players.map(p => {
        const rating = result.playerRatings[p.id];
        if (!rating) return { ...p, fitness: Math.min(100, p.fitness + 5) };
        
        const isGK = p.position === 'GK';
        const goalsInThisMatch = result.events.filter(e => e.type === 'GOAL' && e.player === p.name && e.teamId === 'home').length;
        
        return { 
          ...p, 
          fitness: Math.max(50, p.fitness - 12),
          matchHistory: [...p.matchHistory, rating],
          stats: {
            ...p.stats,
            appearances: p.stats.appearances + 1,
            goals: p.stats.goals + goalsInThisMatch,
            cleanSheets: isGK ? (cleanSheet ? p.stats.cleanSheets + 1 : p.stats.cleanSheets) : p.stats.cleanSheets,
            saves: isGK ? p.stats.saves + (savesCount > 0 ? savesCount : Math.floor(Math.random() * 3)) : p.stats.saves,
            avgRating: (p.stats.avgRating * p.stats.appearances + rating) / (p.stats.appearances + 1)
          }
        };
      });

      const netSpend = prev.financials.expenditure - prev.financials.revenue;
      const ffpStatus = netSpend > 30000000 ? 'Violation' : netSpend > 15000000 ? 'Warning' : 'Healthy';

      return { 
        ...prev, 
        matchday: prev.matchday + 1,
        funds: prev.funds + matchRevenue - weeklyWages,
        players: updatedPlayers,
        financials: {
          ...prev.financials,
          revenue: prev.financials.revenue + matchRevenue,
          expenditure: prev.financials.expenditure + weeklyWages,
          wageBill: weeklyWages,
          ffpStatus
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

  const StatComparisonRow: React.FC<{ label: string, values: [number, number], suffix?: string }> = ({ label, values, suffix = '' }) => (
    <div className="flex flex-col gap-2">
        <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-widest">
            <span>{values[0]}{suffix}</span>
            <span>{label}</span>
            <span>{values[1]}{suffix}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-800 rounded-full flex overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: `${(values[0] / (values[0] + values[1])) * 100}%` }}></div>
            <div className="h-full bg-slate-700" style={{ width: `${(values[1] / (values[0] + values[1])) * 100}%` }}></div>
        </div>
    </div>
  );

  if (!isStarted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950">
        <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="w-24 h-24 bg-blue-600 rounded-[32px] mx-auto flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-3 transition-transform hover:rotate-0">
            <i className="fas fa-futbol text-white text-5xl"></i>
          </div>
          <div className="space-y-3">
            <h1 className="text-5xl font-black tracking-tighter text-white">GEMINI FM</h1>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">A New Era of Football Management</p>
          </div>
          <button 
            onClick={() => setIsStarted(true)} 
            className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-lg shadow-xl shadow-blue-900/40 hover:bg-blue-500 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            START CAREER <i className="fas fa-arrow-right"></i>
          </button>
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Powered by Google Gemini 3.0</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 font-sans">
      <header className={`sticky top-0 z-50 bg-slate-900/80 border-b border-slate-800 backdrop-blur-md p-4`}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold tracking-tight">{team.name} <span className="text-blue-500 text-[10px] ml-1">v5</span></h1>
            <p className="text-[10px] uppercase font-black text-slate-400">Security: {team.jobSecurity}%</p>
          </div>
          <div className="flex gap-4 items-center">
             <div className="text-right hidden sm:block">
               <p className="text-[10px] uppercase font-bold text-slate-500">Starting XI</p>
               <p className={`text-xs font-black ${team.tactics.startingXI.length === 11 ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
                  {team.tactics.startingXI.length} / 11
               </p>
             </div>
             <p className="font-mono font-bold text-emerald-400">£{(team.funds / 1000000).toFixed(1)}M</p>
             <button onClick={startLiveMatch} disabled={simulating} className="bg-blue-600 px-6 py-2 rounded-full font-bold text-sm hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20 active:scale-95">
                {simulating ? `LIVE: ${matchClock}'` : "Play Match"}
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8">
        {!simulating && (
            <nav className="flex gap-8 mb-8 border-b border-slate-800 pb-4 overflow-x-auto scrollbar-hide">
            {['office', 'squad', 'transfers', 'tactics', 'table', 'financials'].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab as any)} className={`text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === tab ? 'text-blue-400 border-b border-blue-400 pb-4 -mb-4' : 'text-slate-500 hover:text-slate-300'}`}>
                {tab}
                </button>
            ))}
            </nav>
        )}

        {activeTab === 'office' && !simulating && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
            <div className="bg-slate-900 rounded-[40px] p-8 border border-slate-800 shadow-xl">
              <h2 className="text-2xl font-black uppercase mb-6 tracking-tighter">Academy Infrastructure</h2>
              <div className="space-y-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black uppercase text-slate-500">Facility Level</span>
                  <span className="text-sm font-black text-blue-400">{team.academyLevel} / 5</span>
                </div>
                <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                  <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${(team.academyLevel / 5) * 100}%` }} />
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button onClick={upgradeAcademy} disabled={team.academyLevel >= 5} className="p-4 bg-slate-800 rounded-2xl text-center hover:bg-slate-700 transition-all border border-white/5 disabled:opacity-50">
                    <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Upgrade Facility</p>
                    <p className="font-black text-emerald-400">£{team.academyLevel * 5}M</p>
                  </button>
                  <button onClick={recruitFromAcademy} disabled={isRecruiting} className="p-4 bg-blue-600 rounded-2xl text-center hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50">
                    <p className="text-[9px] font-black uppercase text-white/70 mb-1">Recruit Scout</p>
                    <p className="font-black text-white">{isRecruiting ? 'Searching...' : '£500k'}</p>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[40px] p-8 border border-slate-800">
               <h3 className="text-xs font-black uppercase text-slate-500 mb-6 tracking-widest">Club Summary</h3>
               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Active Squad</span>
                    <span className="text-sm font-black">{team.players.length} Players</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Matchday</span>
                    <span className="text-sm font-black">{team.matchday} / {SEASON_LENGTH}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400">Avg. Potential</span>
                    <span className="text-sm font-black text-emerald-400">
                      {(team.players.reduce((a, b) => a + b.potential, 0) / team.players.length).toFixed(1)}
                    </span>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'financials' && !simulating && (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-xl">
                    <h3 className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Available Funds</h3>
                    <p className="text-4xl font-black text-emerald-400">£{(team.funds / 1000000).toFixed(2)}M</p>
                </div>
                <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-xl">
                    <h3 className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">Season Revenue</h3>
                    <p className="text-4xl font-black text-blue-400">£{(team.financials.revenue / 1000000).toFixed(2)}M</p>
                </div>
                <div className="bg-slate-900 p-8 rounded-[40px] border border-slate-800 shadow-xl">
                    <h3 className="text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">FFP Status</h3>
                    <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${team.financials.ffpStatus === 'Healthy' ? 'bg-emerald-500' : team.financials.ffpStatus === 'Warning' ? 'bg-amber-500' : 'bg-rose-500'} animate-pulse`}></div>
                        <p className="text-2xl font-black uppercase tracking-tighter">{team.financials.ffpStatus}</p>
                    </div>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'transfers' && !simulating && (
            <div className="space-y-8 animate-in fade-in">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-black tracking-tighter uppercase">Transfer Market</h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sign professional talent from around the globe</p>
                    </div>
                    <button 
                        onClick={refreshMarket} 
                        disabled={loadingMarket}
                        className="bg-slate-800 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-colors border border-white/5 disabled:opacity-50"
                    >
                        {loadingMarket ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : <i className="fas fa-sync-alt mr-2"></i>}
                        Refresh Market
                    </button>
                </div>

                {marketPlayers.length === 0 && !loadingMarket && (
                    <div className="py-20 text-center bg-slate-900/50 rounded-[48px] border border-dashed border-white/5">
                        <i className="fas fa-search text-4xl mb-4 text-slate-800"></i>
                        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Market empty. Hit refresh to scout players.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {marketPlayers.map(player => (
                        <div key={player.id} className="bg-slate-900 p-6 rounded-[32px] border border-white/5 space-y-4">
                            <div className="flex justify-between items-start">
                                <span className={`text-[9px] font-black px-2 py-1 rounded bg-slate-800 text-blue-400`}>{player.position}</span>
                                <span className="text-2xl font-black">{player.rating}</span>
                            </div>
                            <div>
                                <p className="font-black text-lg text-white">{player.name}</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase">{player.nationality} • {player.age}</p>
                            </div>
                            <div className="py-2 border-y border-white/5 flex justify-between">
                                <span className="text-[10px] text-slate-500 font-black uppercase">Value</span>
                                <span className="text-[10px] text-emerald-400 font-black">£{(player.marketValue / 1000000).toFixed(1)}M</span>
                            </div>
                            <button 
                                onClick={() => buyPlayer(player)}
                                className="w-full py-3 bg-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
                            >
                                Sign Player
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {activeTab === 'tactics' && !simulating && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
                <div className="bg-slate-900 p-8 rounded-[48px] border border-slate-800">
                    <h3 className="text-2xl font-black uppercase mb-8 tracking-tighter">Tactical Board</h3>
                    <div className="pitch aspect-[4/5] rounded-3xl mb-8 overflow-hidden relative shadow-2xl">
                        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-12 h-12 bg-white/10 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-black uppercase shadow-lg backdrop-blur-sm">ATT</div>
                        <div className="absolute top-[50%] left-1/2 -translate-x-1/2 w-12 h-12 bg-white/10 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-black uppercase shadow-lg backdrop-blur-sm">CM</div>
                        <div className="absolute bottom-[20%] left-[30%] w-12 h-12 bg-white/10 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-black uppercase shadow-lg backdrop-blur-sm">CB</div>
                        <div className="absolute bottom-[20%] left-[70%] -translate-x-full w-12 h-12 bg-white/10 rounded-full border border-white/20 flex items-center justify-center text-[8px] font-black uppercase shadow-lg backdrop-blur-sm">CB</div>
                        <div className="absolute bottom-[5%] left-1/2 -translate-x-1/2 w-12 h-12 bg-amber-500/20 rounded-full border border-amber-500/40 flex items-center justify-center text-[8px] font-black uppercase shadow-lg backdrop-blur-sm">GK</div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Mentality</label>
                            <select value={team.tactics.mentality} onChange={(e) => updateTactics({ mentality: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold appearance-none outline-none focus:border-blue-500 text-slate-100 cursor-pointer">
                                <option>Defensive</option>
                                <option>Balanced</option>
                                <option>Attacking</option>
                                <option>Gung-Ho</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Focus</label>
                            <select value={team.tactics.focus} onChange={(e) => updateTactics({ focus: e.target.value as any })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold appearance-none outline-none focus:border-blue-500 text-slate-100 cursor-pointer">
                                <option>Mixed</option>
                                <option>Wings</option>
                                <option>Central</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[48px] border border-slate-800 flex flex-col">
                    <h3 className="text-xs font-black uppercase text-slate-500 mb-6 tracking-widest">Lineup Role Assignments</h3>
                    <div className="space-y-4 flex-grow max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                        {team.players.filter(p => team.tactics.startingXI.includes(p.id)).length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-slate-950/50 rounded-3xl border border-dashed border-white/5 opacity-40">
                              <i className="fas fa-users-slash text-4xl mb-4 text-slate-700"></i>
                              <p className="text-[10px] font-black uppercase tracking-widest">No players in Starting XI</p>
                              <button onClick={() => setActiveTab('squad')} className="mt-4 text-[10px] text-blue-500 font-black uppercase hover:underline">Go to Squad</button>
                           </div>
                        ) : (
                          team.players.filter(p => team.tactics.startingXI.includes(p.id)).map(p => (
                            <div key={p.id} className="bg-slate-950 p-4 rounded-3xl border border-white/5 flex items-center justify-between group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-[10px] font-black ${p.position === 'GK' ? 'bg-amber-500/10 text-amber-500' : p.position === 'ATT' ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                        {p.position}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-100">{p.name}</p>
                                        <p className="text-[8px] font-black uppercase text-slate-500">Rating: {p.rating}</p>
                                    </div>
                                </div>
                                <select 
                                    value={team.tactics.roleAssignments[p.id] || 'Standard'}
                                    onChange={(e) => {
                                        const newRoles = { ...team.tactics.roleAssignments, [p.id]: e.target.value as any };
                                        updateTactics({ roleAssignments: newRoles });
                                    }}
                                    className="bg-slate-900/50 text-[10px] font-black uppercase px-4 py-2 rounded-xl outline-none text-blue-400 cursor-pointer"
                                >
                                    {p.position === 'GK' && <option>Sweeper Keeper</option>}
                                    {p.position === 'DEF' && <><option>No-Nonsense</option><option>Ball Playing</option></>}
                                    {p.position === 'MID' && <><option>Playmaker</option><option>Box-to-Box</option><option>Ball Winner</option></>}
                                    {p.position === 'ATT' && <><option>Target Man</option><option>Poacher</option><option>False Nine</option></>}
                                    <option>Standard</option>
                                </select>
                            </div>
                          ))
                        )}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'match' && (simulating || lastMatch) && (
           <div className="animate-in fade-in duration-500">
              <div className="bg-slate-900 p-10 rounded-[56px] border border-slate-800 shadow-2xl mb-8">
                  <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-8 text-center">
                    <div className="flex-1">
                        <h2 className="text-xl font-black uppercase text-slate-400 mb-2 tracking-widest">{team.name}</h2>
                        <p className="text-8xl font-black text-white">{liveScore.home}</p>
                    </div>
                    <div className="flex flex-col items-center">
                        <div className="text-blue-500 font-black text-4xl mb-2">{simulating ? `${matchClock}'` : 'FT'}</div>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-black uppercase text-slate-400 mb-2 tracking-widest">{lastMatch?.awayTeam}</h2>
                        <p className="text-8xl font-black text-white">{liveScore.away}</p>
                    </div>
                  </div>

                  {!simulating && lastMatch && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-slate-950/80 p-8 rounded-[40px] border border-blue-500/20 shadow-inner">
                                <h3 className="text-xs font-black uppercase text-blue-400 mb-4 tracking-widest flex items-center gap-2">Tactical Breakdown</h3>
                                <p className="text-lg font-bold text-slate-100 leading-relaxed mb-6 italic">"{lastMatch.tacticalAnalysis}"</p>
                                <div className="space-y-4">
                                    <StatComparisonRow label="Possession" values={lastMatch.stats.possession} suffix="%" />
                                    <StatComparisonRow label="Shots" values={lastMatch.stats.shots} />
                                    <StatComparisonRow label="Pass Accuracy" values={lastMatch.stats.passAccuracy} suffix="%" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div className="bg-amber-500/10 p-8 rounded-[40px] border border-amber-500/30">
                                <h3 className="text-[10px] font-black uppercase text-amber-400 mb-4 tracking-widest">Man of the Match</h3>
                                <p className="text-2xl font-black text-white mb-2">{lastMatch.manOfTheMatch.name}</p>
                                <p className="text-[10px] font-bold text-amber-200/60 leading-relaxed uppercase">{lastMatch.manOfTheMatch.reason}</p>
                            </div>
                        </div>
                    </div>
                  )}

                  {simulating && (
                    <div className="bg-slate-950 p-8 rounded-[40px] border border-white/5 h-[400px] overflow-y-auto flex flex-col-reverse gap-4">
                        {matchEvents.map((e, i) => (
                            <div key={i} className={`p-4 rounded-2xl border flex items-center gap-4 animate-in slide-in-from-right bg-white/[0.02] border-white/5 ${e.type === 'GOAL' ? 'bg-emerald-500/10 border-emerald-500/30' : ''}`}>
                                <span className="font-black text-xs text-blue-400 w-8">{e.minute}'</span>
                                <i className={`fas ${getEventIcon(e.type)} text-lg w-6 text-center`}></i>
                                <span className="font-bold uppercase text-[10px] tracking-tight">{e.description}</span>
                            </div>
                        ))}
                    </div>
                  )}
              </div>
           </div>
        )}

        {activeTab === 'squad' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in">
            {team.players.map(player => (
              <PlayerCard 
                key={player.id} 
                player={player} 
                assignedRole={team.tactics.roleAssignments[player.id]} 
                isStarting={team.tactics.startingXI.includes(player.id)}
                onToggleSelection={() => toggleStartingXI(player.id)}
              />
            ))}
          </div>
        )}

        {activeTab === 'table' && (
          <div className="space-y-3 animate-in fade-in">
            {leagueStandings.filter(t => t.tier === team.tier).map((row, idx) => (
               <div key={row.name} className={`flex items-center justify-between px-6 py-5 rounded-3xl border transition-all ${row.name === team.name ? 'bg-blue-600/20 border-blue-500 scale-[1.02] shadow-xl shadow-blue-900/10' : 'bg-slate-900 border-slate-800'}`}>
                  <span className="font-black w-8">{idx + 1}</span>
                  <span className="font-black flex-1 uppercase tracking-tight">{row.name}</span>
                  <div className="flex gap-8 items-center text-xs font-bold text-slate-400">
                    <span className="w-4">W:{row.wins}</span>
                    <span className="w-4">L:{row.losses}</span>
                  </div>
                  <span className="font-mono font-black text-lg ml-8">{row.points} <span className="text-[10px] text-slate-500 font-bold">PTS</span></span>
               </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
