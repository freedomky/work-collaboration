import { GoogleGenAI, Type } from "@google/genai";
import { User, AISuggestedTask } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert blob to base64
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:audio/wav;base64,")
      const base64Content = base64String.split(',')[1];
      resolve(base64Content);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const extractTasksFromContent = async (
  content: string, 
  users: User[], 
  audioBase64?: string,
  audioMimeType?: string
): Promise<{ tasks: AISuggestedTask[], summary: string }> => {

  const userListString = users.map(u => u.name).join(', ');

  const systemInstruction = `
    你是一个专业的企业行政助理AI。
    你的目标是分析会议内容（文本或音频），识别不同的发言人，并完成以下任务：
    1. 生成一份简明扼要的专业会议纪要（中文）。
    2. 提取具体的待办事项（任务）。
    
    现有团队成员名单：[${userListString}]。
    
    对于每个任务，请识别：
    - 任务标题 (Title): 简短的行动指令。
    - 详细内容 (Content): 背景和具体要求。
    - 负责人 (Assignee): 必须从未提供的团队成员名单中完全匹配。如果提到的人不在名单中，或者无法确定，请留空或填 "未分配"。如果音频中提到名字，请尝试匹配。
    - 交付时间 (Due Date): 格式 YYYY-MM-DD。根据上下文推断（如"下周五"、"明天"）。如果未提及，返回空字符串。

    请以JSON格式返回结果。
  `;

  const prompt = audioBase64 
    ? "请听这段会议录音，总结会议纪要并提取每个人的待办事项。"
    : `请分析以下会议记录文本，总结纪要并提取待办事项：\n\n${content}`;

  const parts: any[] = [{ text: prompt }];
  
  if (audioBase64 && audioMimeType) {
    parts.unshift({
      inlineData: {
        mimeType: audioMimeType,
        data: audioBase64
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING, description: "专业的中文会议纪要" },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  assigneeName: { type: Type.STRING },
                  dueDate: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      summary: result.summary || "无法生成摘要。",
      tasks: result.tasks || []
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("AI 处理失败，请重试。");
  }
};