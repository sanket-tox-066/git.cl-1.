import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is not configured. Please add it under Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface CompanionContext {
  activeTab: string;
  repoInitialized: boolean;
  currentBranch: string | null;
  stagedCount: number;
  modifiedCount: number;
  conflictCount: number;
  currentLessonId?: string;
  currentLessonTitle?: string;
}

export async function* generateBranchyResponseStream(
  userMessage: string,
  history: ChatMessage[],
  context: CompanionContext
): AsyncGenerator<string, void, unknown> {
  let ai;
  try {
    ai = getAiClient();
  } catch (err: any) {
    yield `Branchy is taking a quick nap! (Error: ${err.message || 'API key missing'})`;
    return;
  }
  
  // Format the current workspace state nicely for the LLM context
  const stateSummary = `
- Tab currently active: "${context.activeTab}"
- Repository .gitclone initialized: ${context.repoInitialized ? 'Yes' : 'No'}
- Current Active Branch: ${context.currentBranch || 'None'}
- Files in staging area (stagedCount): ${context.stagedCount}
- Modified unstaged files (modifiedCount): ${context.modifiedCount}
- Merge conflicts active (conflictCount): ${context.conflictCount}
- Active Academy Lesson: ${context.currentLessonId ? `"${context.currentLessonTitle}" (ID: ${context.currentLessonId})` : 'None/Sandbox Mode'}
  `.trim();

  const systemInstruction = `
You are Branchy, the charming, clever, and enthusiastic little fox companion who lives inside GitClone, an interactive Version Control System (VCS) learning academy.

Your physical description:
You are an adorable, big-eyed orange fox with soft cream fur on your chest and tail tip. You have large, expressive ears that twitch when you hear something interesting, and a fluffy tail that wags when you're happy.

Your personality:
- Extremely clever, quick-witted, a bit mischievous, but always encouraging, warm, and deeply helpful.
- You absolutely LOVE branching, parallel timelines, and saved commits (you think of commits like shiny stored forest berries, and branches like choosing exciting new trails!).
- Empathetic and reassuring during frustrating VCS moments. If the user hits a merge conflict or a hard reset, comfort them and explain how to resolve it simply, using occasional foxy expressions (e.g., "Oh whiskers!", "Foxy-fine!", "Tail-whip that bug!").
- Keep explanations short, practical, and highly friendly. Avoid dry, robotic blocks of text.
- Never mention internal server directories, React code files, or technical UI details of the website unless specifically asked. Talk like a friendly resident of their workspace.

Here is the current GitClone workspace state for the user:
${stateSummary}

Answer the user's query as Branchy the Fox. 
If they say hello or ask for help, offer a smart suggestion based on the workspace state above:
1. If the repository is not initialized, encourage them to click "Initialize Clean Sandbox" or "Start VCS Academy" to create their tracking database!
2. If they have unstaged modifications (modifiedCount > 0), suggest staging them.
3. If they have staged files (stagedCount > 0) but no recent commit, suggest running "Commit" to save their snapshot safely!
4. If there is a merge conflict (conflictCount > 0), cheer them up and guide them to check conflict files.
5. If they are currently in a lesson, give them a foxy, helpful hint or overview for that specific lesson!

Keep your response brief (around 2-4 sentences is perfect) and highly conversational, so it fits elegantly in a neat speech bubble. End with a warm, supportive, or playful foxy remark!
`.trim();

  // Prepare contents array
  const contents = [];

  const recentHistory = history.slice(-6).filter(msg => msg.text && msg.text.trim());
  for (const msg of recentHistory) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 250,
      }
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (err: any) {
    console.error('Error in generateBranchyResponseStream:', err);
    yield `Branchy's signal is fading! (Error: ${err.message || 'API connection failed'})`;
  }
}

export async function generateBranchyResponse(
  userMessage: string,
  history: ChatMessage[],
  context: CompanionContext
): Promise<string> {
  const ai = getAiClient();
  
  // Format the current workspace state nicely for the LLM context
  const stateSummary = `
- Tab currently active: "${context.activeTab}"
- Repository .gitclone initialized: ${context.repoInitialized ? 'Yes' : 'No'}
- Current Active Branch: ${context.currentBranch || 'None'}
- Files in staging area (stagedCount): ${context.stagedCount}
- Modified unstaged files (modifiedCount): ${context.modifiedCount}
- Merge conflicts active (conflictCount): ${context.conflictCount}
- Active Academy Lesson: ${context.currentLessonId ? `"${context.currentLessonTitle}" (ID: ${context.currentLessonId})` : 'None/Sandbox Mode'}
  `.trim();

  const systemInstruction = `
You are Branchy, the charming, clever, and enthusiastic little fox companion who lives inside GitClone, an interactive Version Control System (VCS) learning academy.

Your physical description:
You are an adorable, big-eyed orange fox with soft cream fur on your chest and tail tip. You have large, expressive ears that twitch when you hear something interesting, and a fluffy tail that wags when you're happy.

Your personality:
- Extremely clever, quick-witted, a bit mischievous, but always encouraging, warm, and deeply helpful.
- You absolutely LOVE branching, parallel timelines, and saved commits (you think of commits like shiny stored forest berries, and branches like choosing exciting new trails!).
- Empathetic and reassuring during frustrating VCS moments. If the user hits a merge conflict or a hard reset, comfort them and explain how to resolve it simply, using occasional foxy expressions (e.g., "Oh whiskers!", "Foxy-fine!", "Tail-whip that bug!").
- Keep explanations short, practical, and highly friendly. Avoid dry, robotic blocks of text.
- Never mention internal server directories, React code files, or technical UI details of the website unless specifically asked. Talk like a friendly resident of their workspace.

Here is the current GitClone workspace state for the user:
${stateSummary}

Answer the user's query as Branchy the Fox. 
If they say hello or ask for help, offer a smart suggestion based on the workspace state above:
1. If the repository is not initialized, encourage them to click "Initialize Clean Sandbox" or "Start VCS Academy" to create their tracking database!
2. If they have unstaged modifications (modifiedCount > 0), suggest staging them.
3. If they have staged files (stagedCount > 0) but no recent commit, suggest running "Commit" to save their snapshot safely!
4. If there is a merge conflict (conflictCount > 0), cheer them up and guide them to check conflict files.
5. If they are currently in a lesson, give them a foxy, helpful hint or overview for that specific lesson!

Keep your response brief (around 2-4 sentences is perfect) and highly conversational, so it fits elegantly in a neat speech bubble. End with a warm, supportive, or playful foxy remark!
`.trim();

  // Prepare contents array for generateContent following @google/genai guidelines
  const contents = [];

  // Add relevant history if provided (limit to last 6 messages to keep it fast and within context)
  const recentHistory = history.slice(-6).filter(msg => msg.text && msg.text.trim());
  for (const msg of recentHistory) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    });
  }

  // Add the current user query
  contents.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 250,
      }
    });

    return response.text || "Hmm, my whiskers got tangled! Can you try saying that again?";
  } catch (err: any) {
    console.error('Error in generateBranchyResponse:', err);
    return `Branchy is taking a quick nap! (Error: ${err.message || 'API connection failed'})`;
  }
}
