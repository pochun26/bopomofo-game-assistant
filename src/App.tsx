/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Play, 
  Settings, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  LayoutGrid,
  Info,
  FileText,
  X
} from 'lucide-react';

interface QuestionPart {
  phonetic: string;
  char: string;
  isFlipped: boolean;
}

interface Question {
  id: string;
  parts: QuestionPart[];
}

const TOTAL_GROUPS = 8;

const STORAGE_KEYS = {
  QUESTIONS: 'bopomofo-game-questions',
  SCORES: 'bopomofo-game-scores'
};

const DEFAULT_QUESTIONS: Question[] = [
  {
    id: '1',
    parts: [
      { phonetic: 'ㄋ', char: '牛', isFlipped: false },
      { phonetic: 'ㄖ', char: '肉', isFlipped: false },
      { phonetic: 'ㄇ', char: '麵', isFlipped: false }
    ]
  },
  {
    id: '2',
    parts: [
      { phonetic: 'ㄇ', char: '馬', isFlipped: false },
      { phonetic: 'ㄕ', char: '上', isFlipped: false },
      { phonetic: 'ㄈ', char: '發', isFlipped: false },
      { phonetic: 'ㄘ', char: '財', isFlipped: false }
    ]
  }
];

// Load from localStorage helper
const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (item) {
      return JSON.parse(item) as T;
    }
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
  }
  return defaultValue;
};

// Save to localStorage helper
const saveToStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

export default function App() {
  const [mode, setMode] = useState<'host' | 'game'>('host');
  
  // Initialize questions from localStorage or default
  const [questions, setQuestions] = useState<Question[]>(() => 
    loadFromStorage(STORAGE_KEYS.QUESTIONS, DEFAULT_QUESTIONS)
  );
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Scoring State - Initialize from localStorage
  // scores[questionId][groupId] = score for that group on that question
  const [scores, setScores] = useState<Record<string, Record<number, number>>>(() =>
    loadFromStorage(STORAGE_KEYS.SCORES, {})
  );

  // Save questions to localStorage whenever they change
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.QUESTIONS, questions);
  }, [questions]);

  // Save scores to localStorage whenever they change
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SCORES, scores);
  }, [scores]);

  // Clear all data function
  const clearAllData = () => {
    if (confirm('確定要清除所有題庫和計分資料嗎？此操作無法復原。')) {
      localStorage.removeItem(STORAGE_KEYS.QUESTIONS);
      localStorage.removeItem(STORAGE_KEYS.SCORES);
      setQuestions(DEFAULT_QUESTIONS);
      setScores({});
      setCurrentQuestionIndex(0);
      setMode('host');
    }
  };
  
  // Host State
  const [newPhonetic, setNewPhonetic] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Parse answer string: English words (no spaces) count as one unit, Chinese characters count individually
  const parseAnswer = (answer: string): string[] => {
    const parts: string[] = [];
    const words = answer.trim().split(/\s+/).filter(w => w);
    
    words.forEach(word => {
      // Check if word contains Chinese characters
      const chineseRegex = /[\u4e00-\u9fff]/;
      if (chineseRegex.test(word)) {
        // Split Chinese characters individually, keep English parts together
        let currentPart = '';
        for (let i = 0; i < word.length; i++) {
          const char = word[i];
          if (chineseRegex.test(char)) {
            // If we have accumulated English characters, add them first
            if (currentPart) {
              parts.push(currentPart);
              currentPart = '';
            }
            // Add Chinese character as separate part
            parts.push(char);
          } else {
            // Accumulate English characters
            currentPart += char;
          }
        }
        // Add any remaining English characters
        if (currentPart) {
          parts.push(currentPart);
        }
      } else {
        // Pure English word, add as one part
        parts.push(word);
      }
    });
    
    return parts;
  };

  // Parse phonetic string: split by space if present, otherwise split by character
  const parsePhonetic = (phonetic: string): string[] => {
    const trimmed = phonetic.trim();
    // If contains spaces, split by spaces
    if (trimmed.includes(' ')) {
      return trimmed.split(/\s+/).filter(p => p);
    }
    // Otherwise split by character
    return trimmed.split('').filter(p => p);
  };

  const handleBulkImport = () => {
    const lines = bulkText.split('\n').filter(line => line.trim());
    const newQuestions: Question[] = [];
    let errorCount = 0;

    lines.forEach(line => {
      // Split by tab or 2+ spaces to separate columns
      const columns = line.trim().split(/\s{2,}|\t/).map(c => c.trim()).filter(c => c);
      if (columns.length < 2) {
        errorCount++;
        return;
      }

      const rawPhonetic = columns[0];
      const rawAnswer = columns[1];

      // Parse phonetic and answer using new logic
      const pParts = parsePhonetic(rawPhonetic);
      const aParts = parseAnswer(rawAnswer);

      if (pParts.length === aParts.length && pParts.length > 0) {
        newQuestions.push({
          id: crypto.randomUUID(),
          parts: pParts.map((p, i) => ({
            phonetic: p,
            char: aParts[i],
            isFlipped: false
          }))
        });
      } else {
        errorCount++;
      }
    });

    if (newQuestions.length > 0) {
      setQuestions(prev => [...prev, ...newQuestions]);
      setBulkText('');
      setShowBulkImport(false);
      if (errorCount > 0) {
        alert(`成功匯入 ${newQuestions.length} 題，但有 ${errorCount} 題格式不符被跳過。`);
      }
    } else if (errorCount > 0) {
      alert(`匯入失敗，請檢查格式是否正確（注音與答案數量需一致）。`);
    }
  };

  const addQuestion = () => {
    const pParts = parsePhonetic(newPhonetic);
    const aParts = parseAnswer(newAnswer);

    if (pParts.length === 0 || aParts.length === 0) {
      alert('請輸入注音與答案');
      return;
    }

    if (pParts.length !== aParts.length) {
      alert(`注音數量 (${pParts.length}) 與答案單位數 (${aParts.length}) 不符`);
      return;
    }

    const newQ: Question = {
      id: crypto.randomUUID(),
      parts: pParts.map((p, i) => ({
        phonetic: p,
        char: aParts[i],
        isFlipped: false
      }))
    };

    setQuestions([...questions, newQ]);
    setNewPhonetic('');
    setNewAnswer('');
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const startGame = () => {
    if (questions.length === 0) {
      alert('請先新增題庫');
      return;
    }
    setMode('game');
    setCurrentQuestionIndex(0);
    // Reset all flips when starting
    setQuestions(prev => prev.map(q => ({
      ...q,
      parts: q.parts.map(p => ({ ...p, isFlipped: false }))
    })));
  };

  const toggleFlip = (partIndex: number) => {
    setQuestions(prev => {
      const next = [...prev];
      const q = { ...next[currentQuestionIndex] };
      const parts = [...q.parts];
      parts[partIndex] = { ...parts[partIndex], isFlipped: !parts[partIndex].isFlipped };
      q.parts = parts;
      next[currentQuestionIndex] = q;
      return next;
    });
  };

  const resetCurrent = () => {
    setQuestions(prev => {
      const next = [...prev];
      const q = { ...next[currentQuestionIndex] };
      q.parts = q.parts.map(p => ({ ...p, isFlipped: false }));
      next[currentQuestionIndex] = q;
      return next;
    });
  };

  // Scoring functions
  const updateScore = (questionId: string, groupId: number, delta: number) => {
    setScores(prev => {
      const questionScores = prev[questionId] || {};
      const currentScore = questionScores[groupId] || 0;
      const newScore = Math.max(0, currentScore + delta); // Ensure score doesn't go below 0
      
      return {
        ...prev,
        [questionId]: {
          ...questionScores,
          [groupId]: newScore
        }
      };
    });
  };

  // Calculate total scores for each group
  const totalScores = useMemo(() => {
    const totals = Array(TOTAL_GROUPS).fill(0);
    Object.values(scores).forEach(questionScores => {
      Object.entries(questionScores).forEach(([groupId, score]) => {
        const groupIndex = parseInt(groupId);
        if (groupIndex >= 0 && groupIndex < TOTAL_GROUPS) {
          totals[groupIndex] += score;
        }
      });
    });
    return totals;
  }, [scores]);

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#141414] font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#141414]/10 bg-white/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#141414] rounded-lg flex items-center justify-center text-white font-bold">
              注
            </div>
            <h1 className="text-xl font-semibold tracking-tight">注音猜謎助手</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setMode('host')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                mode === 'host' ? 'bg-[#141414] text-white shadow-lg' : 'hover:bg-black/5'
              }`}
            >
              <Settings size={16} />
              後台設定
            </button>
            <button 
              onClick={startGame}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                mode === 'game' ? 'bg-[#141414] text-white shadow-lg' : 'hover:bg-black/5'
              }`}
            >
              <Play size={16} />
              開始遊戲
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {mode === 'host' ? (
            <motion.div 
              key="host"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Input Section */}
              <section className="bg-white rounded-3xl p-8 shadow-sm border border-[#141414]/5">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-[#5A5A40]">
                    <Plus size={20} />
                    <h2 className="text-lg font-bold uppercase tracking-wider">新增題目</h2>
                  </div>
                  <button 
                    onClick={() => setShowBulkImport(!showBulkImport)}
                    className="text-sm font-bold uppercase tracking-widest opacity-50 hover:opacity-100 transition-all flex items-center gap-2"
                  >
                    <FileText size={16} />
                    {showBulkImport ? '取消批次匯入' : '批次匯入'}
                  </button>
                </div>
                
                <AnimatePresence mode="wait">
                  {showBulkImport ? (
                    <motion.div
                      key="bulk"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div className="bg-[#F5F5F0] rounded-2xl p-4 text-xs text-[#141414]/60 flex items-start gap-3">
                        <Info size={16} className="shrink-0 mt-0.5" />
                        <p>
                          格式說明：每行一題，注音與答案之間使用 <strong>Tab</strong> 或 <strong>多個空格</strong> 分隔。<br/>
                          例如：<code className="bg-white/50 px-1 rounded">ㄒㄜㄑㄜ	邪惡企鵝</code> 或 <code className="bg-white/50 px-1 rounded">ㄏ ㄅ 	紅包</code><br/>
                          混合格式：<code className="bg-white/50 px-1 rounded">ㄆㄎ一ㄈㄉㄘ	Pin k oi 發大財</code>（英文單詞算一個單位，中文每個字算一個單位）
                        </p>
                      </div>
                      <textarea 
                        placeholder="在此貼上題庫內容..."
                        value={bulkText}
                        onChange={(e) => setBulkText(e.target.value)}
                        className="w-full h-48 bg-[#F5F5F0] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#141414] transition-all text-sm font-mono"
                      />
                      <div className="flex justify-end">
                        <button 
                          onClick={handleBulkImport}
                          className="bg-[#141414] text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-95"
                        >
                          確認匯入
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="single"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest opacity-50">題目注音 (空格分隔)</label>
                          <input 
                            type="text" 
                            placeholder="例如: ㄑ ㄜ"
                            value={newPhonetic}
                            onChange={(e) => setNewPhonetic(e.target.value)}
                            className="w-full bg-[#F5F5F0] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#141414] transition-all text-lg"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest opacity-50">答案文字</label>
                          <input 
                            type="text" 
                            placeholder="例如: 企鵝"
                            value={newAnswer}
                            onChange={(e) => setNewAnswer(e.target.value)}
                            className="w-full bg-[#F5F5F0] border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-[#141414] transition-all text-lg"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-8 flex justify-end">
                        <button 
                          onClick={addQuestion}
                          className="bg-[#5A5A40] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#4A4A30] transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2"
                        >
                          <Plus size={20} />
                          加入題庫
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* List Section */}
              <section>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2 text-[#5A5A40]">
                    <LayoutGrid size={20} />
                    <h2 className="text-lg font-bold uppercase tracking-wider">目前題庫 ({questions.length})</h2>
                  </div>
                  <button 
                    onClick={clearAllData}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 bg-red-500 text-white hover:bg-red-600 shadow-md active:scale-95"
                  >
                    <Trash2 size={16} />
                    清除所有資料
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {questions.length === 0 ? (
                    <div className="bg-white/50 border-2 border-dashed border-[#141414]/10 rounded-3xl p-12 text-center">
                      <p className="text-[#141414]/40 font-medium italic">目前還沒有題目，請從上方新增</p>
                    </div>
                  ) : (
                    questions.map((q, idx) => (
                      <motion.div 
                        layout
                        key={q.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-white rounded-2xl p-6 flex items-center justify-between shadow-sm border border-[#141414]/5 group hover:border-[#141414]/20 transition-all"
                      >
                        <div className="flex items-center gap-8">
                          <span className="text-xs font-mono opacity-30">#{idx + 1}</span>
                          <div className="flex gap-2">
                            {q.parts.map((p, i) => (
                              <div key={i} className="flex flex-col items-center">
                                <span className="text-2xl font-bold">{p.phonetic}</span>
                                <span className="text-xs opacity-40">{p.char}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <button 
                          onClick={() => removeQuestion(q.id)}
                          className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={20} />
                        </button>
                      </motion.div>
                    ))
                  )}
                </div>
              </section>
            </motion.div>
          ) : (
            <motion.div 
              key="game"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center space-y-12"
            >
              {/* Total Scores Display */}
              <div className="w-full bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-[#141414]/5">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#5A5A40] mb-4 text-center">總分</h3>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                  {totalScores.map((score, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="text-xs font-medium text-[#141414]/50 mb-1">第{index + 1}組</div>
                      <div className="text-2xl font-bold text-[#141414]">{score}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Game Controls */}
              <div className="w-full flex items-center justify-between bg-white/50 p-4 rounded-3xl backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <button 
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                    className="p-3 rounded-2xl hover:bg-white disabled:opacity-20 transition-all"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <span className="font-mono font-bold text-lg">
                    {currentQuestionIndex + 1} / {questions.length}
                  </span>
                  <button 
                    disabled={currentQuestionIndex === questions.length - 1}
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="p-3 rounded-2xl hover:bg-white disabled:opacity-20 transition-all flex items-center gap-2 font-medium"
                  >
                    <ChevronRight size={24} />
                    下一題
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={resetCurrent}
                    className="p-3 rounded-2xl hover:bg-white text-[#5A5A40] transition-all flex items-center gap-2 font-medium"
                  >
                    <RotateCcw size={20} />
                    重置提示
                  </button>
                </div>
              </div>

              {/* Cards Display */}
              <div className="flex flex-wrap justify-center gap-6 md:gap-10 py-12">
                {currentQuestion?.parts.map((part, idx) => (
                  <div key={idx} className="perspective-1000">
                    <motion.div
                      onClick={() => toggleFlip(idx)}
                      animate={{ rotateY: part.isFlipped ? 180 : 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                      className="relative w-32 h-48 md:w-48 md:h-72 cursor-pointer preserve-3d"
                    >
                      {/* Front (Phonetic) */}
                      <div className="absolute inset-0 backface-hidden bg-white rounded-[2rem] shadow-xl border-4 border-[#141414] flex flex-col items-center justify-center p-6">
                        <span className="text-6xl md:text-8xl font-black text-[#141414]">{part.phonetic}</span>
                        <div className="mt-4 w-8 h-1 bg-[#141414]/10 rounded-full" />
                      </div>

                      {/* Back (Character) */}
                      <div 
                        className="absolute inset-0 backface-hidden bg-[#5A5A40] rounded-[2rem] shadow-xl border-4 border-[#141414] flex items-center justify-center p-6"
                        style={{ transform: 'rotateY(180deg)' }}
                      >
                        <span className="text-6xl md:text-8xl font-black text-white">{part.char}</span>
                      </div>
                    </motion.div>
                  </div>
                ))}
              </div>

              {/* Scoring Controls */}
              <div className="w-full bg-white/80 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-[#141414]/5">
                <h3 className="text-sm font-bold uppercase tracking-widest text-[#5A5A40] mb-4 text-center">本題計分</h3>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
                  {Array.from({ length: TOTAL_GROUPS }).map((_, groupId) => {
                    const questionId = currentQuestion?.id || '';
                    const currentScore = scores[questionId]?.[groupId] || 0;
                    
                    return (
                      <div key={groupId} className="flex flex-col items-center gap-2">
                        <div className="text-xs font-medium text-[#141414]/50">第{groupId + 1}組</div>
                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => updateScore(questionId, groupId, 1)}
                            className="p-2 bg-[#141414] text-white rounded-xl hover:bg-black transition-all active:scale-95 shadow-md"
                            aria-label={`第${groupId + 1}組加1分`}
                          >
                            <ChevronUp size={20} />
                          </button>
                          <div className="text-xl font-bold text-[#141414] min-w-[2rem] text-center py-1">
                            {currentScore}
                          </div>
                          <button
                            onClick={() => updateScore(questionId, groupId, -1)}
                            disabled={currentScore === 0}
                            className="p-2 bg-[#5A5A40] text-white rounded-xl hover:bg-[#4A4A30] transition-all active:scale-95 shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label={`第${groupId + 1}組減1分`}
                          >
                            <ChevronDown size={20} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Instructions */}
              <div className="flex items-center gap-2 text-[#141414]/40 bg-white/30 px-6 py-3 rounded-full">
                <Info size={16} />
                <p className="text-sm font-medium">點擊卡片翻開提示內容</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .perspective-1000 { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
      `}} />
    </div>
  );
}
