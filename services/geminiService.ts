
import { GoogleGenAI, Type } from "@google/genai";
import { MatchResult, Team, Player, Position } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function simulateMatchWithAI(
  myTeam: Team, 
  opponentName: string, 
  opponentRating: number
): Promise<MatchResult> {
  const teamStrength = myTeam.players.reduce((acc, p) => acc + p.rating, 0) / myTeam.players.length;
  
  const playerRolesDesc = myTeam.players.map(p => {
    const role = myTeam.tactics.roleAssignments[p.id] || 'Standard';
    return `${p.name} (Role: ${role}, Rating: ${p.rating})`;
  }).join(', ');

  const prompt = `Simulate a high-stakes professional football match between ${myTeam.name} (STR: ${teamStrength.toFixed(1)}) and ${opponentName} (STR: ${opponentRating}). 
  
  MANAGER TACTICS:
  - Mentality: ${myTeam.tactics.mentality}
  - Focus: ${myTeam.tactics.focus}
  - Core Player Roles: ${playerRolesDesc}
  
  RETURN STRUCTURED ANALYSIS:
  1. DYNAMIC EVENTS: Return 18-24 realistic events.
  2. TACTICAL ANALYSIS: A 3-sentence deep dive into why the result happened (e.g., "The midfield diamond struggled against the opponent's wing play").
  3. MAN OF THE MATCH: Identify the star performer and why.
  4. MATCH STATS: Realistic numbers for Possession (sum=100), Shots, and Pass Accuracy.
  5. RATINGS: Assign matchRatings (4.0-10.0) for every player in the Starting XI.
  
  Return the results in the specified JSON format.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          homeScore: { type: Type.INTEGER },
          awayScore: { type: Type.INTEGER },
          summary: { type: Type.STRING },
          tacticalAnalysis: { type: Type.STRING },
          manOfTheMatch: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              reason: { type: Type.STRING }
            },
            required: ['name', 'reason']
          },
          stats: {
            type: Type.OBJECT,
            properties: {
              possession: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              shots: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              passAccuracy: { type: Type.ARRAY, items: { type: Type.INTEGER } }
            },
            required: ['possession', 'shots', 'passAccuracy']
          },
          playerRatings: {
            type: Type.OBJECT,
            additionalProperties: { type: Type.NUMBER }
          },
          events: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                minute: { type: Type.INTEGER },
                type: { type: Type.STRING, enum: ['GOAL', 'YELLOW', 'RED', 'SUB', 'COMMENTARY', 'SHOT_OFF_TARGET', 'FOUL', 'SAVE', 'WOODWORK'] },
                team: { type: Type.STRING },
                description: { type: Type.STRING },
                player: { type: Type.STRING }
              },
              required: ['minute', 'type', 'description']
            }
          }
        },
        required: ['homeScore', 'awayScore', 'summary', 'tacticalAnalysis', 'manOfTheMatch', 'stats', 'events', 'playerRatings']
      }
    }
  });

  const textContent = response.text || "{}";
  const data = JSON.parse(textContent);
  const attendance = myTeam.stadium.capacity * (0.8 + Math.random() * 0.2);
  const revenue = Math.floor(attendance * (30 + (myTeam.stadium.facilityLevel * 10)));

  return {
    homeTeam: myTeam.name,
    awayTeam: opponentName,
    homeScore: data.homeScore,
    awayScore: data.awayScore,
    summary: data.summary,
    tacticalAnalysis: data.tacticalAnalysis,
    manOfTheMatch: data.manOfTheMatch,
    stats: data.stats,
    revenue: revenue,
    playerRatings: data.playerRatings,
    events: data.events.map((e: any) => ({
      ...e,
      teamId: e.team === myTeam.name ? 'home' : 'away'
    }))
  };
}

export async function getScoutReport(player: Player): Promise<string> {
  const prompt = `Write a short 2-sentence scouting report for a football player named ${player.name}, position ${player.position}, age ${player.age}, rating ${player.rating}. Attributes: PAC ${player.attributes.pace}, SHO ${player.attributes.shooting}, PAS ${player.attributes.passing}, DEF ${player.attributes.tackling}, STA ${player.attributes.stamina}. Focus on their playing style and ideal tactical role.`;
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });
  return response.text || "No report available.";
}

export async function generateTransferMarket(averageRating: number): Promise<Player[]> {
  const prompt = `Generate 4 professional football players currently on the transfer market. 
  Ratings around ${averageRating}. Include name, nationality, position, rating, age, attributes.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            nationality: { type: Type.STRING },
            position: { type: Type.STRING, enum: ['GK', 'DEF', 'MID', 'ATT'] },
            rating: { type: Type.INTEGER },
            age: { type: Type.INTEGER },
            attributes: {
              type: Type.OBJECT,
              properties: {
                pace: { type: Type.INTEGER },
                shooting: { type: Type.INTEGER },
                passing: { type: Type.INTEGER },
                tackling: { type: Type.INTEGER },
                stamina: { type: Type.INTEGER }
              },
              required: ['pace', 'shooting', 'passing', 'tackling', 'stamina']
            }
          },
          required: ['name', 'nationality', 'position', 'rating', 'age', 'attributes']
        }
      }
    }
  });

  const textContent = response.text || "[]";
  const playersData = JSON.parse(textContent);
  return playersData.map((p: any) => ({
    ...p,
    id: Math.random().toString(36).substr(2, 9),
    potential: p.rating + Math.floor(Math.random() * 15),
    form: 7,
    fitness: 100,
    marketValue: p.rating * p.rating * 10000,
    trainingFocus: 'Balanced',
    exp: 0,
    salary: p.rating * 1000,
    contractYears: 3,
    matchHistory: [],
    stats: { appearances: 0, goals: 0, assists: 0, avgRating: 0, cleanSheets: 0, saves: 0 }
  }));
}

export async function generateAcademyProspect(academyLevel: number): Promise<Player> {
  const ratingFloor = 45 + (academyLevel * 5);
  const potentialFloor = 70 + (academyLevel * 4);
  
  const prompt = `Generate a world-class youth prospect (age 16) for an academy with facility level ${academyLevel}/5. 
  The player should have a starting rating of at least ${ratingFloor} and potential of at least ${potentialFloor}.
  Be creative with the nationality and name.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          nationality: { type: Type.STRING },
          position: { type: Type.STRING, enum: ['GK', 'DEF', 'MID', 'ATT'] },
          rating: { type: Type.INTEGER },
          potential: { type: Type.INTEGER },
          attributes: {
            type: Type.OBJECT,
            properties: {
              pace: { type: Type.INTEGER },
              shooting: { type: Type.INTEGER },
              passing: { type: Type.INTEGER },
              tackling: { type: Type.INTEGER },
              stamina: { type: Type.INTEGER }
            },
            required: ['pace', 'shooting', 'passing', 'tackling', 'stamina']
          }
        },
        required: ['name', 'nationality', 'position', 'rating', 'potential', 'attributes']
      }
    }
  });

  const textContent = response.text || "{}";
  const data = JSON.parse(textContent);
  return {
    ...data,
    id: Math.random().toString(36).substr(2, 9),
    age: 16,
    form: 6,
    fitness: 100,
    marketValue: data.rating * data.potential * 500,
    isAcademy: true,
    trainingFocus: 'Balanced',
    exp: 0,
    salary: 500,
    contractYears: 5,
    matchHistory: [],
    stats: { appearances: 0, goals: 0, assists: 0, avgRating: 0, cleanSheets: 0, saves: 0 }
  };
}
