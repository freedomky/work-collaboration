import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, FileText, CheckCircle, AlertCircle, Upload } from 'lucide-react';
import { extractTasksFromContent, blobToBase64 } from '../services/genaiService';
import { db } from '../services/mockDb';
import { AISuggestedTask, Task, TaskStatus, UserRole, User } from '../types';

interface MeetingRecorderProps {
  currentUser: User;
  onTasksCreated: () => void;
}

const MeetingRecorder: React.FC<MeetingRecorderProps> = ({ currentUser, onTasksCreated }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcriptText, setTranscriptText] = useState('');
  const [generatedSummary, setGeneratedSummary] = useState('');
  const [suggestedTasks, setSuggestedTasks] = useState<AISuggestedTask[]>([]);
  const [activeTab, setActiveTab] = useState<'record' | 'text'>('record');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  const users = db.getUsers();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("无法访问麦克风，请检查权限。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const processContent = async () => {
    setIsProcessing(true);
    try {
      let result;
      if (activeTab === 'record' && audioBlob) {
        const base64 = await blobToBase64(audioBlob);
        result = await extractTasksFromContent('', users, base64, 'audio/webm');
      } else if (activeTab === 'text' && transcriptText) {
        result = await extractTasksFromContent(transcriptText, users);
      } else {
        throw new Error("没有内容可处理");
      }

      setGeneratedSummary(result.summary);
      setSuggestedTasks(result.tasks);

      // Save meeting record
      db.addMeeting({
        id: Date.now().toString(),
        title: `会议记录 ${new Date().toLocaleDateString()}`,
        date: new Date().toISOString(),
        content: activeTab === 'record' ? '语音录音' : transcriptText,
        summary: result.summary,
        recordingUrl: audioBlob ? URL.createObjectURL(audioBlob) : undefined
      });

    } catch (error) {
      console.error(error);
      alert("处理会议内容失败。");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateTasks = () => {
    suggestedTasks.forEach(st => {
      // Find assignee ID (fuzzy matching handled by AI returning strict names if possible, else manual)
      const assignee = users.find(u => u.name === st.assigneeName);
      
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: st.title,
        content: st.content,
        assigneeId: assignee ? assignee.id : null, // Leave null if not found
        creatorId: currentUser.id,
        dueDate: st.dueDate || new Date(Date.now() + 86400000 * 3).toISOString(), // Default 3 days if missing
        status: TaskStatus.NOT_STARTED,
        progress: 0
      };
      db.addTask(newTask);
    });
    
    onTasksCreated();
    // Reset
    setSuggestedTasks([]);
    setGeneratedSummary('');
    setAudioBlob(null);
    setTranscriptText('');
    setRecordingTime(0);
    alert('任务已创建成功！');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Mic className="w-5 h-5 text-indigo-600" />
        会议记录与AI助手
      </h2>

      <div className="flex gap-4 border-b border-slate-100 mb-4">
        <button
          onClick={() => setActiveTab('record')}
          className={`pb-2 text-sm font-medium ${activeTab === 'record' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
        >
          语音录制
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`pb-2 text-sm font-medium ${activeTab === 'text' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
        >
          文本粘贴 / 导入
        </button>
      </div>

      <div className="min-h-[200px]">
        {activeTab === 'record' ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-50 animate-pulse' : 'bg-slate-50'}`}>
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 ${isRecording ? 'bg-red-500' : 'bg-indigo-600'}`}
              >
                {isRecording ? <Square className="w-8 h-8 fill-current" /> : <Mic className="w-8 h-8" />}
              </button>
            </div>
            <div className="text-2xl font-mono font-medium text-slate-700">{formatTime(recordingTime)}</div>
            {audioBlob && !isRecording && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm">
                <CheckCircle className="w-4 h-4" />
                录音已捕获，准备处理
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2">
               系统会自动识别不同的音色并匹配任务。如果检测到陌生人，将在下方提示手动分配。
            </p>
          </div>
        ) : (
          <textarea
            className="w-full h-48 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="请在此粘贴会议记录、纪要或文本..."
            value={transcriptText}
            onChange={(e) => setTranscriptText(e.target.value)}
          />
        )}
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={processContent}
          disabled={isProcessing || (activeTab === 'record' && !audioBlob) || (activeTab === 'text' && !transcriptText)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          {isProcessing ? '正在分析...' : '生成纪要与提取任务'}
        </button>
      </div>

      {(generatedSummary || suggestedTasks.length > 0) && (
        <div className="mt-8 border-t border-slate-100 pt-6 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">会议纪要 (AI生成)</h3>
          <div className="bg-slate-50 p-4 rounded-lg text-slate-700 text-sm whitespace-pre-line mb-6 border border-slate-200">
            {generatedSummary}
          </div>

          <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center justify-between">
            <span>提取的任务 ({suggestedTasks.length})</span>
          </h3>
          
          <div className="space-y-3 mb-6">
            {suggestedTasks.map((task, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-lg p-3 flex gap-3 items-start shadow-sm">
                <div className="bg-indigo-100 text-indigo-700 p-2 rounded shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <input 
                    value={task.title}
                    onChange={(e) => {
                      const newTasks = [...suggestedTasks];
                      newTasks[idx].title = e.target.value;
                      setSuggestedTasks(newTasks);
                    }}
                    className="font-medium text-slate-800 w-full bg-transparent focus:underline outline-none" 
                    placeholder="任务标题"
                  />
                  <textarea 
                    value={task.content}
                    onChange={(e) => {
                      const newTasks = [...suggestedTasks];
                      newTasks[idx].content = e.target.value;
                      setSuggestedTasks(newTasks);
                    }}
                    className="w-full text-xs text-slate-500 mt-1 bg-transparent resize-none h-12 outline-none border-b border-transparent focus:border-slate-200"
                    placeholder="任务详情..."
                  />
                  <div className="flex gap-4 mt-2 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <span>👤</span>
                      <select 
                        value={task.assigneeName} 
                        onChange={(e) => {
                           const newTasks = [...suggestedTasks];
                           newTasks[idx].assigneeName = e.target.value;
                           setSuggestedTasks(newTasks);
                        }}
                        className="bg-transparent border-b border-slate-200 hover:border-indigo-500 outline-none max-w-[120px]"
                      >
                         <option value="未分配">未分配</option>
                         {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>📅</span>
                      <input 
                        type="date"
                        value={task.dueDate}
                        onChange={(e) => {
                           const newTasks = [...suggestedTasks];
                           newTasks[idx].dueDate = e.target.value;
                           setSuggestedTasks(newTasks);
                        }}
                        className="bg-transparent border-b border-slate-200 hover:border-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleCreateTasks}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium shadow-sm transition-colors"
            >
              确认并创建任务
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingRecorder;