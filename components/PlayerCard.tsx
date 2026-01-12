
import React, { useState } from 'react';
import { Player, Position, PlayerRole } from '../types';
import { getScoutReport } from '../services/geminiService';

interface PlayerCardProps {
  player: Player;
  assignedRole?: PlayerRole;
}

const SkillBar: React.FC<{ label: string; value: number; color: string; isKey?: boolean }> = ({ label, value, color, isKey }) => (
  <div className={`flex flex-col gap-1.5 ${isKey ? 'scale-105 origin-left' : 'opacity-70'}`}>
    <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
      <span className={isKey ? 'text-blue-400' : ''}>{label}</span>
      <span className="font-mono text-slate-300">{value}</span>
    </div>
    <div className={`h-1.5 w-full bg-slate-950/50 rounded-full overflow-hidden border border-white/5`}>
      <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${value}%` }} />
    </div>
  </div>
);

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, assignedRole = 'Standard' }) => {
  const [view, setView] = useState<'attributes' | 'career'>('attributes');
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGetScoutReport = async () => {
    if (report) return;
    setLoading(true);
    try {
      const res = await getScoutReport(player);
      setReport(res);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const getTheme = (pos: Position) => {
    switch (pos) {
      case 'GK': return 'from-amber-400 to-amber-600 shadow-amber-900/20';
      case 'DEF': return 'from-blue-400 to-blue-600 shadow-blue-900/20';
      case 'MID': return 'from-emerald-400 to-emerald-600 shadow-emerald-900/20';
      case 'ATT': return 'from-rose-400 to-rose-600 shadow-rose-900/20';
      default: return 'from-slate-400 to-slate-600';
    }
  };

  const getRoleIcon = (role: PlayerRole) => {
    const icons: Record<PlayerRole, string> = {
      'Sweeper Keeper': 'fa-shield-halved',
      'No-Nonsense': 'fa-anchor',
      'Ball Playing': 'fa-compass',
      'Playmaker': 'fa-wand-magic-sparkles',
      'Box-to-Box': 'fa-bolt',
      'Ball Winner': 'fa-handcuffs',
      'Target Man': 'fa-tower-broadcast',
      'Poacher': 'fa-crosshairs',
      'False Nine': 'fa-ghost',
      'Standard': 'fa-user'
    };
    return icons[role] || 'fa-user';
  };

  return (
    <div className="group relative bg-slate-900/60 backdrop-blur-xl rounded-[32px] p-6 border border-white/5 hover:border-blue-500/40 transition-all overflow-hidden shadow-2xl flex flex-col h-full">
      {/* Visual Role & Position Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-block bg-gradient-to-br ${getTheme(player.position)} text-[9px] font-black px-2.5 py-1 rounded-lg text-white uppercase tracking-widest shadow-lg`}>
              {player.position}
            </span>
            <span className="bg-slate-800/80 text-[8px] font-black px-2.5 py-1 rounded-lg text-blue-400 flex items-center gap-1.5 uppercase border border-blue-500/20">
              {/* FIX: Cast 'Standard' to PlayerRole explicitly to ensure type safety in function call */}
              <i className={`fas ${getRoleIcon(assignedRole as PlayerRole)} text-[10px]`}></i>
              {assignedRole}
            </span>
          </div>
          <h3 className="font-black text-slate-50 text-xl tracking-tight leading-tight mt-2 group-hover:text-blue-400 transition-colors">
            {player.name}
          </h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            {player.nationality} • {player.age}YRS
          </p>
        </div>
        <div className="text-right">
          <span className="text-4xl font-black text-white leading-none tracking-tighter tabular-nums">{player.rating}</span>
          <div className="text-[8px] font-black uppercase text-blue-500 tracking-widest">OVR</div>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => setView('attributes')} 
          className={`flex-1 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${view === 'attributes' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-800/50 text-slate-500 hover:text-slate-300'}`}
        >
          Attributes
        </button>
        <button 
          onClick={() => setView('career')} 
          className={`flex-1 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${view === 'career' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-slate-800/50 text-slate-500 hover:text-slate-300'}`}
        >
          Career
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-slate-950/40 p-5 rounded-2xl border border-white/5 mb-4 flex-grow shadow-inner">
        {view === 'attributes' ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
            <SkillBar label="PAC" value={player.attributes.pace} color="bg-orange-500" isKey={player.position === 'ATT'} />
            <SkillBar label="SHO" value={player.attributes.shooting} color="bg-rose-500" isKey={player.position === 'ATT'} />
            <SkillBar label="PAS" value={player.attributes.passing} color="bg-sky-500" isKey={player.position === 'MID'} />
            <SkillBar label="DEF" value={player.attributes.tackling} color="bg-emerald-500" isKey={player.position === 'DEF'} />
            <SkillBar label="STA" value={player.attributes.stamina} color="bg-purple-500" />
            <SkillBar label="FIT" value={player.fitness} color={player.fitness > 80 ? 'bg-emerald-400' : 'bg-amber-400'} />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex justify-between items-center bg-slate-900/80 p-3 rounded-xl border border-white/5 shadow-md">
                <div className="text-center flex-1">
                    <p className="text-[8px] text-slate-500 font-black uppercase mb-0.5">App</p>
                    <p className="text-sm font-bold">{player.stats.appearances}</p>
                </div>
                <div className="text-center flex-1 border-x border-white/5">
                    <p className="text-[8px] text-slate-500 font-black uppercase mb-0.5">Goal</p>
                    <p className="text-sm font-bold text-rose-400">{player.stats.goals}</p>
                </div>
                <div className="text-center flex-1">
                    <p className="text-[8px] text-slate-500 font-black uppercase mb-0.5">Avg</p>
                    <p className="text-sm font-bold text-emerald-400">{player.stats.avgRating.toFixed(2)}</p>
                </div>
            </div>
            <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[8px] text-slate-500 font-black uppercase tracking-wider">Form Trend</p>
                  <span className="text-[7px] text-slate-600 font-bold uppercase">Last 5 Matches</span>
                </div>
                <div className="flex items-end gap-2 h-14 bg-slate-900/30 rounded-lg p-2 border border-white/5">
                    {player.matchHistory.slice(-5).map((rating, i) => (
                        <div key={i} className="flex-1 bg-blue-500/30 rounded-t-sm border-t border-blue-400/50 relative group/bar transition-all hover:bg-blue-400/50" style={{ height: `${(rating / 10) * 100}%` }}>
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-black opacity-0 group-hover/bar:opacity-100 transition-opacity bg-slate-800 px-1 rounded pointer-events-none z-10">
                              {rating.toFixed(1)}
                            </div>
                        </div>
                    ))}
                    {player.matchHistory.length === 0 && (
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-[9px] text-slate-600 italic font-medium uppercase tracking-tighter">No recent data available</p>
                      </div>
                    )}
                </div>
            </div>
          </div>
        )}
      </div>

      {/* Contract & Financial Info */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/5 hover:border-blue-500/20 transition-colors">
          <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Contract</span>
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-file-contract text-blue-500/60 text-[10px]"></i>
            <span className={`text-xs font-black ${player.contractYears <= 1 ? 'text-rose-500 animate-pulse' : 'text-slate-300'}`}>
              {player.contractYears} {player.contractYears === 1 ? 'Season' : 'Seasons'}
            </span>
          </div>
        </div>
        <div className="bg-white/[0.03] p-3 rounded-2xl border border-white/5 hover:border-emerald-500/20 transition-colors">
          <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">Wage</span>
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-coins text-emerald-500/60 text-[10px]"></i>
            <span className="text-xs font-black text-emerald-400">£{(player.salary / 1000).toFixed(1)}k</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <button 
        onClick={handleGetScoutReport}
        disabled={loading}
        className="group/btn w-full py-3.5 bg-slate-800 hover:bg-blue-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 border border-white/5 flex items-center justify-center gap-2"
      >
        {loading ? (
          <i className="fas fa-circle-notch fa-spin"></i>
        ) : (
          <>
            <i className="fa-solid fa-robot text-blue-400 group-hover/btn:text-white transition-colors"></i>
            AI Scout Insights
          </>
        )}
      </button>
      
      {report && (
        <div className="mt-3 p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-[9px] leading-relaxed text-blue-100 italic animate-in fade-in slide-in-from-top-1 shadow-lg backdrop-blur-sm">
          <i className="fa-solid fa-quote-left text-blue-500/40 mr-2"></i>
          {report}
        </div>
      )}
    </div>
  );
};
