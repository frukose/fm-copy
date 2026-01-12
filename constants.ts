
import { Player, Position } from './types';

const generateAttributes = (pos: Position, rating: number) => {
  const variation = () => Math.floor(Math.random() * 20) - 10;
  const base = rating;
  return {
    pace: Math.min(99, Math.max(30, base + variation() + (pos === 'ATT' ? 10 : 0))),
    shooting: Math.min(99, Math.max(10, base + variation() + (pos === 'ATT' ? 15 : -15))),
    passing: Math.min(99, Math.max(20, base + variation() + (pos === 'MID' ? 10 : 0))),
    tackling: Math.min(99, Math.max(10, base + variation() + (pos === 'DEF' ? 20 : -20))),
    stamina: Math.min(99, Math.max(40, base + variation())),
  };
};

const generatePlayer = (id: string, name: string, pos: Position, rating: number): Player => ({
  id,
  name,
  age: 18 + Math.floor(Math.random() * 15),
  nationality: ['England', 'France', 'Brazil', 'Spain', 'Germany', 'Argentina', 'Portugal', 'Netherlands'][Math.floor(Math.random() * 8)],
  position: pos,
  rating,
  potential: rating + Math.floor(Math.random() * 12),
  form: 7,
  fitness: 100,
  marketValue: rating * rating * 12000,
  attributes: generateAttributes(pos, rating),
  trainingFocus: 'Balanced',
  exp: 0,
  salary: rating * 1200, 
  contractYears: 1 + Math.floor(Math.random() * 4),
  matchHistory: [],
  stats: { appearances: 0, goals: 0, assists: 0, avgRating: 0, cleanSheets: 0, saves: 0 }
});

export const INITIAL_SQUAD: Player[] = [
  generatePlayer('1', 'Alisson Becker', 'GK', 87),
  generatePlayer('2', 'Caoimhin Kelleher', 'GK', 77),
  generatePlayer('3', 'Virgil van Dijk', 'DEF', 89),
  generatePlayer('4', 'Ibrahima Konaté', 'DEF', 83),
  generatePlayer('5', 'Trent Alexander-Arnold', 'DEF', 86),
  generatePlayer('6', 'Andrew Robertson', 'DEF', 84),
  generatePlayer('7', 'Joe Gomez', 'DEF', 80),
  generatePlayer('8', 'Jarell Quansah', 'DEF', 76),
  generatePlayer('9', 'Conor Bradley', 'DEF', 75),
  generatePlayer('10', 'Kostas Tsimikas', 'DEF', 77),
  generatePlayer('11', 'Alexis Mac Allister', 'MID', 86),
  generatePlayer('12', 'Dominik Szoboszlai', 'MID', 83),
  generatePlayer('13', 'Ryan Gravenberch', 'MID', 79),
  generatePlayer('14', 'Harvey Elliott', 'MID', 81),
  generatePlayer('15', 'Wataru Endo', 'MID', 80),
  generatePlayer('16', 'Curtis Jones', 'MID', 79),
  generatePlayer('17', 'Mohamed Salah', 'ATT', 91),
  generatePlayer('18', 'Luis Díaz', 'ATT', 85),
  generatePlayer('19', 'Darwin Núñez', 'ATT', 82),
  generatePlayer('20', 'Diogo Jota', 'ATT', 84),
  generatePlayer('21', 'Cody Gakpo', 'ATT', 83),
  generatePlayer('22', 'Federico Chiesa', 'ATT', 82),
];

export const OPPONENTS = [
  "Manchester Blue", "Arsenal London", "Real Madrid", "FC Bayern", 
  "Paris SG", "Juventus", "Inter Milan", "Bayer Leverkusen",
  "FC Barcelona", "Atlético Madrid", "AC Milan", "Dortmund",
  "Napoli", "Chelsea Blue", "Tottenham White", "Aston Villa",
  "Newcastle Black", "Brighton Sea", "West Ham Hammer", "Monaco Prince",
  "Leicester Fox", "Leeds White", "Southampton Saint", "Ipswich Tractor",
  "Sunderland Light", "Hull Tiger", "Middlesbrough Red", "Norwich Canary",
  "Coventry Sky", "Preston Lily", "Bristol City", "Cardiff Blue",
  "Watford Hornet", "Swansea Jack", "Sheffield Steel", "Blackburn Rose",
  "Millwall Lion", "QPR Hoop", "Stoke Potters", "Plymouth Green"
];
