
import React, { useState, useEffect } from 'react';
import { User, Task, TaskStatus, UserRole } from '../types';
import { db } from '../services/mockDb';
import { getNetworkTime, getStartOfDayInChina } from '../services/timeService';
import { Calendar, AlertCircle, User as UserIcon, Plus, Edit2, Check } from 'lucide-react';

interface TaskBoardProps {
  currentUser: User;
}

const TaskBoard: React.FC<TaskBoardProps> = ({ currentUser }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'MY'>('ALL');
  const [isCreating, setIsCreating] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  
  // Edit State for Due Dates
  const [editingDateId, setEditingDateId] = useState<string | null>(null);

  // New Task Form
  const [newTaskData, setNewTaskData] = useState({ title: '', content: '', assigneeId: '', dueDate: '' });

  useEffect(() => {
    loadData();
    // Fetch network time on mount
    getNetworkTime().then(date => {
      console.log("已获取网络时间:", date.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
      setCurrentTime(date);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = () => {
    setTasks(db.getTasks());
    setUsers(db.getUsers());
  };

  /**
   * Calculates overdue days based on Network Time and China Timezone.
   * Returns positive integer for overdue days, 0 or negative if not overdue.
   */
  const calculateDaysOverdue = (dueDateStr: string) => {
    if (!dueDateStr) return 0;
    
    // Normalize "Current Network Time" to start of day in China
    const currentChina = getStartOfDayInChina(currentTime);
    
    // Normalize "Due Date" to start of day in China
    const dueChina = getStartOfDayInChina(new Date(dueDateStr));
    
    // Calculate difference in milliseconds
    const diff = currentChina.getTime() - dueChina.getTime();
    
    // Convert to days
    return Math.floor(diff / (1000 * 3600 * 24));
  };

  const getStatusDisplay = (task: Task) => {
    const overdueDays = calculateDaysOverdue(task.dueDate);
    // Overdue logic: If not completed and date passed.
    const isDone = task.status === TaskStatus.COMPLETED || task.status === TaskStatus.COMPLETED_LATE;
    const isOverdue = overdueDays > 0 && !isDone;

    if (task.status === TaskStatus.COMPLETED) {
      return <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-semibold">已完成</span>;
    }
    if (task.status === TaskStatus.COMPLETED_LATE) {
      return <span className="inline-flex items-center gap-1 text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-semibold">延期完成</span>;
    }
    if (isOverdue) {
      // Prompt Requirement: "如果当前状态是未完成，则显示已延期X天"
      return <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-semibold"><AlertCircle className="w-3 h-3"/> 已延期 {overdueDays} 天</span>;
    }
    if (task.status === TaskStatus.NOT_STARTED) {
      return <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded text-xs font-semibold">未开始</span>;
    }
    return <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-semibold">进展 {task.progress}%</span>;
  };

  const handleStatusChange = (task: Task, newStatus: TaskStatus, progress?: number) => {
    const overdueDays = calculateDaysOverdue(task.dueDate);
    const isOverdue = overdueDays > 0;
    
    // Logic: If already overdue (displayed as such), and user marks complete, it becomes COMPLETED_LATE
    let finalStatus = newStatus;
    if (isOverdue && newStatus === TaskStatus.COMPLETED) {
      finalStatus = TaskStatus.COMPLETED_LATE;
    }

    const updatedTask: Task = {
      ...task,
      status: finalStatus,
      progress: progress !== undefined ? progress : task.progress,
      completedDate: (finalStatus === TaskStatus.COMPLETED || finalStatus === TaskStatus.COMPLETED_LATE) ? new Date().toISOString() : undefined
    };
    
    db.updateTask(updatedTask);
    loadData();
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个任务吗？')) {
      db.deleteTask(id);
      loadData();
    }
  };

  const handleDueDateChange = (task: Task, newDate: string) => {
    if (!newDate) return;
    const updatedTask = { ...task, dueDate: newDate };
    db.updateTask(updatedTask);
    setEditingDateId(null);
    loadData();
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskData.title || !newTaskData.dueDate) return;
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: newTaskData.title,
      content: newTaskData.content,
      assigneeId: newTaskData.assigneeId || null,
      creatorId: currentUser.id,
      dueDate: newTaskData.dueDate,
      status: TaskStatus.NOT_STARTED,
      progress: 0
    };
    db.addTask(newTask);
    setIsCreating(false);
    setNewTaskData({ title: '', content: '', assigneeId: '', dueDate: '' });
    loadData();
  };

  // Permission Logic
  // Admin and Operator can manage ALL (Create, Delete, Edit details)
  // User can manage OWN (Edit details if assignee)
  // STATUS FIELD: Only Admin and Assignee can change.
  // DUE DATE: Only Admin and Operator can change.
  
  const canEditStatus = (task: Task) => {
    if (currentUser.role === UserRole.ADMIN) return true;
    return task.assigneeId === currentUser.id;
  };

  const canEditDueDate = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OPERATOR;
  const userCanDelete = (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OPERATOR);

  const filteredTasks = tasks.filter(t => {
    if (filter === 'MY') return t.assigneeId === currentUser.id;
    return true;
  }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          任务看板
          <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">
             当前系统时间(中国): {currentTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })}
          </span>
        </h2>
        
        <div className="flex items-center gap-3">
          {(currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OPERATOR) && (
            <button 
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> 新建任务
            </button>
          )}

          {currentUser.role !== UserRole.USER && (
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button 
                onClick={() => setFilter('ALL')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                所有任务
              </button>
              <button 
                onClick={() => setFilter('MY')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'MY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                我的任务
              </button>
            </div>
          )}
        </div>
      </div>

      {isCreating && (
        <div className="bg-slate-50 border border-indigo-100 p-6 rounded-xl animate-in fade-in slide-in-from-top-2">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                placeholder="任务名称" 
                className="p-2 border rounded-md w-full"
                value={newTaskData.title}
                onChange={e => setNewTaskData({...newTaskData, title: e.target.value})}
                required
              />
              <input 
                type="date" 
                className="p-2 border rounded-md w-full"
                value={newTaskData.dueDate}
                onChange={e => setNewTaskData({...newTaskData, dueDate: e.target.value})}
                required
              />
            </div>
            <textarea 
               placeholder="具体工作内容..." 
               className="p-2 border rounded-md w-full h-24"
               value={newTaskData.content}
               onChange={e => setNewTaskData({...newTaskData, content: e.target.value})}
            />
            <div className="flex justify-between items-center">
              <select 
                className="p-2 border rounded-md w-full max-w-xs"
                value={newTaskData.assigneeId}
                onChange={e => setNewTaskData({...newTaskData, assigneeId: e.target.value})}
              >
                <option value="">选择负责人...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.title})</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg">取消</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">创建任务</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.length === 0 && (
            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                暂无任务。
            </div>
        )}
        {filteredTasks.map(task => {
          const assignee = users.find(u => u.id === task.assigneeId);
          const isOverdue = calculateDaysOverdue(task.dueDate) > 0 && task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.COMPLETED_LATE;
          const userCanChangeStatus = canEditStatus(task);
          
          return (
            <div key={task.id} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-800">{task.title}</h3>
                    {getStatusDisplay(task)}
                  </div>
                  <p className="text-slate-600 mb-4 text-sm leading-relaxed whitespace-pre-wrap">{task.content}</p>
                  
                  <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 border-t border-slate-50 pt-3 mt-2">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" />
                      <span>负责人: {assignee ? assignee.name : '未分配'}</span>
                    </div>
                    
                    {/* Due Date Display & Edit Logic */}
                    <div className="flex items-center gap-2 group">
                      <Calendar className="w-4 h-4" />
                      <span className="mr-1">交付时间:</span>
                      
                      {editingDateId === task.id ? (
                        <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                          <input 
                            type="date"
                            defaultValue={task.dueDate}
                            className="text-sm p-1 border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                            onBlur={(e) => {
                              // Small delay to allow button click to register if needed, though blur usually suffices
                              handleDueDateChange(task, e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleDueDateChange(task, (e.target as HTMLInputElement).value);
                              if (e.key === 'Escape') setEditingDateId(null);
                            }}
                            autoFocus
                          />
                          <button onClick={() => setEditingDateId(null)} className="text-slate-400 hover:text-slate-600"><Check className="w-3 h-3"/></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                           <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                              {new Date(task.dueDate).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                           </span>
                           {canEditDueDate && (
                             <button 
                               onClick={() => setEditingDateId(task.id)}
                               className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded text-indigo-600"
                               title="修改交付时间"
                             >
                               <Edit2 className="w-3 h-3" />
                             </button>
                           )}
                        </div>
                      )}
                    </div>

                    {userCanDelete && (
                      <button onClick={() => handleDelete(task.id)} className="text-red-400 hover:text-red-600 text-xs ml-auto">
                        删除任务
                      </button>
                    )}
                  </div>
                </div>

                {userCanChangeStatus && (
                  <div className="flex flex-col gap-3 w-full md:w-64 bg-slate-50 p-4 rounded-lg border border-slate-100 shrink-0">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">更新状态</label>
                    
                    {/* Status Dropdown */}
                    <select
                      className="w-full text-sm border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                      value={task.status}
                      disabled={task.status === TaskStatus.COMPLETED || task.status === TaskStatus.COMPLETED_LATE}
                      onChange={(e) => handleStatusChange(task, e.target.value as TaskStatus)}
                    >
                       <option value={TaskStatus.NOT_STARTED}>未开始</option>
                       <option value={TaskStatus.IN_PROGRESS}>进行中 (百分比)</option>
                       {isOverdue ? (
                          <option value={TaskStatus.COMPLETED_LATE}>延期完成</option>
                       ) : (
                          <option value={TaskStatus.COMPLETED}>已完成</option>
                       )}
                    </select>

                    {/* Progress Slider (Only if not done) */}
                    {(task.status === TaskStatus.NOT_STARTED || task.status === TaskStatus.IN_PROGRESS) && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-500">
                           <span>进展进度</span>
                           <span>{task.progress}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={task.progress}
                          onChange={(e) => handleStatusChange(task, task.status === TaskStatus.NOT_STARTED ? TaskStatus.IN_PROGRESS : task.status, parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskBoard;
