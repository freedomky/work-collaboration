import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../services/mockDb';
import { TaskStatus, UserRole, User } from '../types';

interface EmployeeDashboardProps {
  currentUser: User;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ currentUser }) => {
  const [users, setUsers] = useState(db.getUsers());
  const tasks = db.getTasks();

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    db.updateUserRole(userId, newRole);
    setUsers(db.getUsers()); // Refresh
  };

  // Only show stats for OPERATOR and USER, usually ADMIN doesn't have tasks to track performance of? 
  // But let's show everyone who has tasks.
  const data = users.filter(u => u.role !== UserRole.ADMIN).map(user => {
    const userTasks = tasks.filter(t => t.assigneeId === user.id);
    const total = userTasks.length;
    const completed = userTasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const completedLate = userTasks.filter(t => t.status === TaskStatus.COMPLETED_LATE).length;
    const overdue = userTasks.filter(t => {
      const isDone = t.status === TaskStatus.COMPLETED || t.status === TaskStatus.COMPLETED_LATE;
      return !isDone && new Date(t.dueDate) < new Date();
    }).length;

    let score = 0;
    if (total > 0) {
      // Base score: % completed on time
      score = Math.round((completed / total) * 100);
      // Penalize late completion slightly (-5 per)
      score -= (completedLate * 5);
      // Penalize active overdue heavily (-15 per)
      score -= (overdue * 15);
    }
    
    return {
      id: user.id,
      name: user.name,
      completed,
      overdue,
      late: completedLate,
      total,
      score: total === 0 ? 0 : Math.max(0, Math.min(100, score)), // Clamp 0-100
      avatar: user.avatar,
      role: user.role,
      title: user.title
    };
  });

  return (
    <div className="space-y-8">
      
      {/* Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <img src={stat.avatar} alt={stat.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-100" />
            <div className="flex-1">
              <h3 className="font-bold text-slate-800">{stat.name}</h3>
              <div className="text-xs text-slate-500 mb-2">{stat.title}</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="text-2xl font-bold text-indigo-600">{stat.score}</div>
                <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">效率评分</div>
              </div>
              <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${stat.score > 80 ? 'bg-green-500' : stat.score > 60 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                  style={{ width: `${stat.score}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-6">任务执行情况概览</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
              <Tooltip 
                cursor={{fill: '#f1f5f9'}}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="completed" name="按时完成" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
              <Bar dataKey="late" name="延期完成" stackId="a" fill="#f59e0b" />
              <Bar dataKey="overdue" name="当前延期" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Admin User Management */}
      {currentUser.role === UserRole.ADMIN && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">用户权限管理</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-800 font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th className="p-3">用户</th>
                  <th className="p-3">职位</th>
                  <th className="p-3">当前角色</th>
                  <th className="p-3">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id}>
                    <td className="p-3 flex items-center gap-3">
                      <img src={u.avatar} className="w-8 h-8 rounded-full" alt="" />
                      <span className="font-medium text-slate-900">{u.name}</span>
                    </td>
                    <td className="p-3">{u.title}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        u.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700' :
                        u.role === UserRole.OPERATOR ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.role === UserRole.ADMIN ? '管理员' : u.role === UserRole.OPERATOR ? '系统操作员' : '普通用户'}
                      </span>
                    </td>
                    <td className="p-3">
                      {u.role !== UserRole.ADMIN && (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="border border-slate-300 rounded p-1 text-xs"
                        >
                          <option value={UserRole.OPERATOR}>系统操作员</option>
                          <option value={UserRole.USER}>普通用户</option>
                        </select>
                      )}
                      {u.role === UserRole.ADMIN && <span className="text-slate-400 text-xs">不可修改</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;