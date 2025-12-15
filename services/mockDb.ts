import { User, UserRole, Task, TaskStatus, Meeting } from '../types';

// Local Storage Keys
const KEYS = {
  USERS: 'taskflow_users_v2', // Versioned to clear old data if any
  TASKS: 'taskflow_tasks_v2',
  MEETINGS: 'taskflow_meetings_v2'
};

class MockDB {
  private users: User[];
  private tasks: Task[];
  private meetings: Meeting[];

  constructor() {
    this.users = this.load(KEYS.USERS, []);
    this.tasks = this.load(KEYS.TASKS, []);
    this.meetings = this.load(KEYS.MEETINGS, []);
  }

  private load<T>(key: string, defaultData: T): T {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultData;
  }

  private save(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Auth Methods
  registerUser(userData: { name: string; title: string; password?: string }) {
    const isFirst = this.users.length === 0;
    const newUser: User = {
      id: crypto.randomUUID(),
      name: userData.name,
      title: userData.title,
      password: userData.password,
      role: isFirst ? UserRole.ADMIN : UserRole.USER,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.name)}`
    };
    
    this.users.push(newUser);
    this.save(KEYS.USERS, this.users);
    return newUser;
  }

  loginUser(name: string, password?: string): User | undefined {
    // In a real app, hash passwords. Here, plain check.
    return this.users.find(u => u.name === name && (u.password === password || !u.password));
  }

  updateUserRole(userId: string, newRole: UserRole) {
    this.users = this.users.map(u => u.id === userId ? { ...u, role: newRole } : u);
    this.save(KEYS.USERS, this.users);
    return this.users.find(u => u.id === userId);
  }

  // User Methods
  getUsers() { return [...this.users]; }
  getUserById(id: string) { return this.users.find(u => u.id === id); }
  
  // Task Methods
  getTasks() { return [...this.tasks]; }
  
  addTask(task: Task) {
    this.tasks.push(task);
    this.save(KEYS.TASKS, this.tasks);
    return task;
  }

  updateTask(updatedTask: Task) {
    this.tasks = this.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
    this.save(KEYS.TASKS, this.tasks);
    return updatedTask;
  }

  deleteTask(taskId: string) {
    this.tasks = this.tasks.filter(t => t.id !== taskId);
    this.save(KEYS.TASKS, this.tasks);
  }

  // Meeting Methods
  getMeetings() { return [...this.meetings]; }
  
  addMeeting(meeting: Meeting) {
    this.meetings.unshift(meeting); // Newest first
    this.save(KEYS.MEETINGS, this.meetings);
    return meeting;
  }
}

export const db = new MockDB();