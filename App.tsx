import React, { useState } from 'react';
import { User, UserRole, AuthState } from './types';
import { db } from './services/mockDb';
import { LayoutDashboard, Users, ClipboardList, Mic, LogOut, Menu, X, UserPlus, LogIn } from 'lucide-react';
import TaskBoard from './components/TaskBoard';
import EmployeeDashboard from './components/EmployeeDashboard';
import MeetingRecorder from './components/MeetingRecorder';

// Simple Auth Context
const AuthContext = React.createContext<{
  user: User | null;
  login: (u: User) => void;
  logout: () => void;
}>({ user: null, login: () => {}, logout: () => {} });

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ user: null, isAuthenticated: false });
  const [currentView, setCurrentView] = useState<'TASKS' | 'EMPLOYEES' | 'MEETING'>('TASKS');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); 

  // Auth Form State
  const [isLoginView, setIsLoginView] = useState(true);
  const [formData, setFormData] = useState({ name: '', password: '', title: '' });
  const [authError, setAuthError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = db.loginUser(formData.name, formData.password);
    if (user) {
      setAuth({ user, isAuthenticated: true });
      setAuthError('');
    } else {
      setAuthError('用户名或密码错误');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.password) {
      setAuthError('请填写完整信息');
      return;
    }
    const existing = db.getUsers().find(u => u.name === formData.name);
    if (existing) {
      setAuthError('用户名已存在');
      return;
    }
    const newUser = db.registerUser({
      name: formData.name,
      password: formData.password,
      title: formData.title || '员工'
    });
    setAuth({ user: newUser, isAuthenticated: true });
    setAuthError('');
  };

  const logout = () => {
    setAuth({ user: null, isAuthenticated: false });
    setCurrentView('TASKS');
    setFormData({ name: '', password: '', title: '' });
  };

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">TaskFlow AI</h1>
            <p className="text-slate-500">企业级任务执行与跟进系统</p>
          </div>

          <div className="flex gap-4 mb-6 border-b border-slate-100 pb-1">
            <button 
              onClick={() => { setIsLoginView(true); setAuthError(''); }}
              className={`flex-1 pb-2 font-medium transition-colors ${isLoginView ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}
            >
              登录
            </button>
            <button 
              onClick={() => { setIsLoginView(false); setAuthError(''); }}
              className={`flex-1 pb-2 font-medium transition-colors ${!isLoginView ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}
            >
              注册
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
               <span className="font-bold">!</span> {authError}
            </div>
          )}

          <form onSubmit={isLoginView ? handleLogin : handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="请输入用户名"
              />
            </div>
            
            {!isLoginView && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">职位</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="例如：销售经理"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
              <input 
                type="password" 
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="请输入密码"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              {isLoginView ? <><LogIn className="w-5 h-5"/> 登录系统</> : <><UserPlus className="w-5 h-5"/> 注册账号</>}
            </button>
          </form>
          
          {!isLoginView && (
            <p className="mt-4 text-xs text-center text-slate-400">
              * 首位注册的用户将自动成为管理员 (CEO)
            </p>
          )}
        </div>
      </div>
    );
  }

  const roleLabels = {
    [UserRole.ADMIN]: '管理员',
    [UserRole.OPERATOR]: '系统操作员',
    [UserRole.USER]: '普通用户'
  };

  const NavItem = ({ view, icon: Icon, label }: { view: 'TASKS' | 'EMPLOYEES' | 'MEETING', icon: any, label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${currentView === view ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );

  return (
    <AuthContext.Provider value={{ user: auth.user, login: (u) => setAuth({user: u, isAuthenticated: true}), logout }}>
      <div className="min-h-screen bg-slate-50 flex font-sans">
        
        {/* Sidebar Desktop */}
        <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 fixed h-full z-20">
          <div className="p-6 border-b border-slate-100">
             <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-lg">T</span>
              TaskFlow
             </h1>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <NavItem view="TASKS" icon={ClipboardList} label="任务看板" />
            {(auth.user?.role === UserRole.ADMIN || auth.user?.role === UserRole.OPERATOR) && (
              <NavItem view="EMPLOYEES" icon={Users} label="员工管理与概况" />
            )}
            <NavItem view="MEETING" icon={Mic} label="会议助手" />
          </nav>
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 mb-3">
              <img src={auth.user?.avatar} alt="Me" className="w-10 h-10 rounded-full" />
              <div className="overflow-hidden">
                <div className="font-semibold text-slate-800 truncate">{auth.user?.name}</div>
                <div className="text-xs text-slate-500 truncate">{auth.user ? roleLabels[auth.user.role] : ''}</div>
              </div>
            </div>
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-600 p-2 text-sm font-medium transition-colors">
              <LogOut className="w-4 h-4" /> 退出登录
            </button>
          </div>
        </aside>

        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 w-full bg-white z-30 border-b border-slate-200 px-4 py-3 flex justify-between items-center">
          <h1 className="font-bold text-slate-900">TaskFlow</h1>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6 text-slate-600"/> : <Menu className="w-6 h-6 text-slate-600"/>}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 bg-white z-20 pt-16 px-6 space-y-4">
            <NavItem view="TASKS" icon={ClipboardList} label="任务看板" />
            {(auth.user?.role === UserRole.ADMIN || auth.user?.role === UserRole.OPERATOR) && (
              <NavItem view="EMPLOYEES" icon={Users} label="员工管理" />
            )}
            <NavItem view="MEETING" icon={Mic} label="会议助手" />
            <div className="pt-8 border-t border-slate-100 mt-4">
              <button onClick={logout} className="flex items-center gap-2 text-red-600 font-medium">
                <LogOut className="w-5 h-5" /> 退出登录
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className={`flex-1 p-6 md:p-10 md:ml-72 mt-14 md:mt-0 transition-all duration-300`}>
          <div className="max-w-6xl mx-auto">
            {currentView === 'TASKS' && <TaskBoard key={refreshTrigger} currentUser={auth.user!} />}
            {currentView === 'EMPLOYEES' && <EmployeeDashboard currentUser={auth.user!} />}
            {currentView === 'MEETING' && (
              <MeetingRecorder 
                currentUser={auth.user!} 
                onTasksCreated={() => {
                  setRefreshTrigger(p => p + 1); 
                  setCurrentView('TASKS');
                }} 
              />
            )}
          </div>
        </main>

      </div>
    </AuthContext.Provider>
  );
};

export default App;