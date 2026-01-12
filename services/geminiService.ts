
import { GoogleGenAI, Type } from "@google/genai";
import { MatchResult, Team, Player, Position } from "../types";

// Always use named parameter for apiKey
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
  
  EVENT FREQUENCY & LOGIC:
  1. DYNAMIC EVENTS: Return a realistic sequence of 18-24 events.
  2. NEW EVENT TYPES: 
     - 'SAVE': Describe spectacular dives or crucial 1v1 stops. These MUST boost the involved GK's rating.
     - 'SHOT_OFF_TARGET': Describe narrowly missed screamers or frustrating misses under pressure.
     - 'FOUL': Describe tactical trips, heavy challenges, or professional fouls.
     - 'WOODWORK': High-drama moments where the ball rattles the post/bar.
  3. ROLE INTEGRATION: Commentary must mention how roles impact these events (e.g., "The No-Nonsense Defender lunges into a FOUL to prevent a breakaway" or "The Sweeper Keeper makes a massive SAVE outside the box").
  4. PERFORMANCE RATINGS: Assign matchRatings (4.0-10.0). 
     - GKs with multiple SAVES should get 8.5+. 
     - Players committing multiple FOULS or misses should see rating penalties.
  
  Return the results in the specified JSON format.`;

  // Using gemini-3-flash-preview for high-speed complex text tasks
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
          summary: { type: Type.STRING, description: "Detailed narrative of tactical successes and failures." },
          playerRatings: {
            type: Type.OBJECT,
            description: "Map of Player ID to performance rating",
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
        required: ['homeScore', 'awayScore', 'summary', 'events', 'playerRatings']
      }
    }
  });

  // Access .text property directly (not a function call)
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
  // Access .text property directly
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

  // Access .text property directly
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
    stats: { appearances: 0, goals: 0, assists: 0, avgRating: 0 }
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

  // Access .text property directly
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
    stats: { appearances: 0, goals: 0, assists: 0, avgRating: 0 }
  };
}
