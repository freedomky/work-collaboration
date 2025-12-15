export enum UserRole {
  ADMIN = 'ADMIN',      // CEO / 管理员
  OPERATOR = 'OPERATOR', // Assistant / 系统操作员
  USER = 'USER'         // Employee / 普通用户
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  title: string;
  password?: string; // Added for auth simulation
}

export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  COMPLETED_LATE = 'COMPLETED_LATE',
  // OVERDUE is derived
}

export interface Task {
  id: string;
  title: string;
  content: string;
  assigneeId: string | null;
  creatorId: string;
  dueDate: string; // ISO Date string
  completedDate?: string;
  progress: number; // 0-100
  status: TaskStatus;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  content: string; // The transcript or raw text
  summary?: string; // AI Generated minutes
  recordingUrl?: string; // Blob URL for playback
}

export interface AISuggestedTask {
  title: string;
  content: string;
  assigneeName: string;
  dueDate: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}