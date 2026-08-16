/** A file the AI chat says it created/edited during a turn; shown as a card and openable in a tab. */
export interface Artifact {
  id: string;
  name: string;
  language?: string;
  content: string;
}
