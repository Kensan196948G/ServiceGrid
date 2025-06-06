export interface GeminiChatResponse {
  text: string;
  sourceDocs?: { title: string; content: string }[]; 
}