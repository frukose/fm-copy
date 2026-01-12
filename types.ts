
export type Position = 'GK' | 'DEF' | 'MID' | 'ATT';
export type Mentality = 'Defensive' | 'Balanced' | 'Attacking' | 'Gung-Ho';
export type LeagueTier = 1 | 2;
export type PlayerRole = 'Sweeper Keeper' | 'No-Nonsense' | 'Ball Playing' | 'Playmaker' | 'Box-to-Box' | 'Ball Winner' | 'Target Man' | 'Poacher' | 'False Nine' | 'Standard';
export type TrainingFocus = 'Balanced' | 'Physical' | 'Technical' | 'Defensive' | 'Attacking';

export interface Tactics {
  formation: string;
  mentality: Mentality;
  focus: 'Wings' | 'Central' | 'Mixed';
  roleAssignments: Record<string, PlayerRole>;
  startingXI: string[]; // Array of player IDs
}

export interface PlayerAttributes {
  pace: number;
  shooting: number;
  passing: number;
  tackling: number;
  stamina: number;
}

export interface PlayerStats {
  appearances: number;
  goals: number;
  assists: number;
  avgRating: number;
  cleanSheets: number;
  saves: number;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  nationality: string;
  position: Position;
  rating: number;
  potential: number;
  form: number;
  fitness: number;
  marketValue: number;
  isAcademy?: boolean;
  attributes: PlayerAttributes;
  trainingFocus: TrainingFocus;
  exp: number;
  salary: number;
  contractYears: number;
  matchHistory: number[]; // Last 5 ratings
  stats: PlayerStats;
}

export interface Stadium {
  name: string;
  capacity: number;
  facilityLevel: number;
  aestheticLevel: number;
}

export interface Objective {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  reward: number;
  completed: boolean;
  type: 'WINS' | 'GOALS' | 'ACADEMY_PROMOTIONS' | 'STADIUM_EXPANSION';
}

export interface LeagueTeam {
  name: string;
  tier: LeagueTier;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  points: number;
}

export interface Financials {
  revenue: number;
  expenditure: number;
  transferSpend: number;
  wageBill: number;
  ffpStatus: 'Healthy' | 'Warning' | 'Violation';
}

export interface Team {
  id: string;
  name: string;
  managerName: string;
  players: Player[];
  funds: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  tactics: Tactics;
  academyLevel: number;
  stadium: Stadium;
  objectives: Objective[];
  tier: LeagueTier;
  matchday: number;
  jobSecurity: number;
  managerSalary: number;
  managerContractYears: number;
  financials: Financials;
  pointDeduction?: number;
}

export interface MatchEvent {
  minute: number;
  type: 'GOAL' | 'YELLOW' | 'RED' | 'SUB' | 'COMMENTARY' | 'SHOT_OFF_TARGET' | 'FOUL' | 'SAVE' | 'WOODWORK';
  teamId: string;
  description: string;
  player?: string;
}

export interface MatchResult {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  summary: string;
  tacticalAnalysis: string;
  manOfTheMatch: { name: string, reason: string };
  stats: {
    possession: [number, number];
    shots: [number, number];
    passAccuracy: [number, number];
  };
  revenue: number;
  playerRatings: Record<string, number>;
}
