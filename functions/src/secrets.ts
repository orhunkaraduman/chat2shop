import { defineSecret } from 'firebase-functions/params';

export const geminiApiKeySecret = defineSecret('GEMINI_API_KEY');

export const geminiSecrets = [geminiApiKeySecret];
