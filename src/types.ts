export interface User {
  id: string;
  name: string;
  isTyping: boolean;
}

export interface Message {
  id: string;
  text: string;
  userName: string;
  userId: string;
  timestamp: string;
  type: 'chat' | 'system';
}

export interface RoomState {
  users: User[];
  messages: Message[];
}

export type Tone = 'formal' | 'casual' | 'friendly';
