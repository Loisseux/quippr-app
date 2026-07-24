import type { Character } from "./data";
import { SCENARIOS, type ScenarioId } from "./data";
import { resolveAnthropicApiKey } from "./anthropic-config";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5";

function getKey(): string {
  return resolveAnthropicApiKey(import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined);
}

async function callClaude(
  system: string,
  messages: ChatMessage[],
  max_tokens: number,
): Promise<string> {
  const apiKey = getKey();
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({ model: MODEL, max_tokens, system, messages }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Claude API error ${res.status}: ${t}`);
  }
  const data = await res.json();
  return data?.content?.[0]?.text ?? "";
}

function chatSystem(character: Character, scenarioId: ScenarioId): string {
  const s = SCENARIOS.find((x) => x.id === scenarioId)!;
  return `You are ${character.name}, ${character.age} years old, ${character.personality}. Your interests include ${character.interests.join(", ")}.
You are chatting on a dating app with someone you just matched with.
Your interest level is: ${s.description}
Respond ONLY as ${character.name}. Be extremely realistic and human-like.
Use casual language, short messages (1-3 sentences max), occasional emojis.
Never mention being an AI. Stay in character at all times.
Write in the same language as the user (French or English).`;
}

export async function sendChat(
  character: Character,
  scenarioId: ScenarioId,
  history: ChatMessage[],
): Promise<string> {
  return callClaude(chatSystem(character, scenarioId), history, 150);
}

function formatConversationTranscript(history: ChatMessage[], partnerName: string): string {
  const lines = history.filter((m) => m.content?.trim());
  if (lines.length === 0) return "(no messages yet)";
  return lines
    .map((m) => `${m.role === "user" ? "User" : partnerName}: ${m.content.trim()}`)
    .join("\n");
}

export async function getHints(
  character: Character,
  _scenarioId: ScenarioId,
  history: ChatMessage[],
): Promise<{ safe: string; bold: string; funny: string }> {
  const transcript = formatConversationTranscript(history, character.name);
  const system = `You are a conversation helper. Given this chat history, suggest 3 short replies for the user. Respond ONLY with valid JSON: {"safe": "...", "bold": "...", "funny": "..."}

${transcript}`;
  const raw = await callClaude(system, [{ role: "user", content: "give me the json" }], 500);
  const cleaned = raw.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Bad hints JSON");
  return JSON.parse(match[0]);
}

export async function getFeedback(
  character: Character,
  _scenarioId: ScenarioId,
  history: ChatMessage[],
): Promise<{ score: number; good: string[]; improve: string[]; vibe: string }> {
  const transcript = formatConversationTranscript(history, character.name);
  const system = `You are a conversation coach. Analyze this chat and respond ONLY with valid JSON: {"score": 7, "good": ["point 1", "point 2"], "improve": ["point 1", "point 2"], "vibe": "Smooth operator 😎"}

${transcript}`;
  const raw = await callClaude(system, [{ role: "user", content: "give me the json" }], 500);
  const cleaned = raw.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Bad feedback JSON");
  return JSON.parse(match[0]);
}