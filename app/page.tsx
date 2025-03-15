"use client"

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Brain, Send, Sparkles, Command , History, Star } from 'lucide-react';
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

interface ChatHistoryItem {
  prompt: string;
  result: string;
  model: string;
  timestamp: number;
  rating?: {
    score: number;
  };
}

interface CustomSelectionButtonProps {
  selectedAIModel: string;
  setSelectedAIModel: (model: string) => void;
}

const CustomSelectionButton = ({ selectedAIModel, setSelectedAIModel }: CustomSelectionButtonProps) => {
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showModelSelector && !target.closest(".model-selector")) {
        setShowModelSelector(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showModelSelector])

  const aiModels = [
    { id : "auto" , name : "Auto" , description : "Automatically choose the best model" },
    { id : "gemini-2-flash" , name : "Gemini 2.0" , description : "Fast and Accurate model" },
    { id : "deepseek-chat" , name : "Deepseek R1" , description : "Model for intense and complex worload" },
  ];

  const handleModelSelect = (modelId: string) => {
    setSelectedAIModel(modelId)
    setShowModelSelector(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowModelSelector(!showModelSelector)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm text-gray-300 cursor-pointer"
      >
        <Brain className="w-4 h-4 text-purple-400" />
        <span>{aiModels.find((m) => m.id === selectedAIModel)?.name || "Select Model"}</span>
      </button>

      {showModelSelector && (
        <div className="absolute bottom-full mb-2 left-0 w-64 bg-black/80 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl z-10 model-selector">
          <div className="p-2">
            {aiModels.map((model) => (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model.id)}
                className={`w-full text-left p-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer ${
                  selectedAIModel === model.id
                    ? "bg-purple-500/20 text-purple-300"
                    : "hover:bg-white/10 text-gray-300"
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium">{model.name}</div>
                  <div className="text-xs text-gray-400">{model.description}</div>
                </div>
                {selectedAIModel === model.id && <div className="w-2 h-2 rounded-full bg-purple-400"></div>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentRating, setCurrentRating] = useState<number | null>(null);
  const [selectedModel, setSelectedModel] = useState("auto");
  const [usedModel, setUsedModel] = useState('');

  useEffect(() => {
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      setChatHistory(JSON.parse(savedHistory));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setResult('');
    setCurrentRating(null);
    
    try {
      const response = await axios.post('/api/chat', { 
        prompt: prompt,
        model: selectedModel 
      });
      
      setResult(response.data.message.response);
      setUsedModel(response.data.message.model);

      const newHistoryItem: ChatHistoryItem = {
        prompt,
        result: response.data.message.response,
        model: response.data.message.model,
        timestamp: Date.now(),
      };
      setChatHistory(prev => [newHistoryItem, ...prev]);
    } catch (error) {
      console.error("Generation error:", error);
      setResult("An error occured while generating response!!");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRating = (score: number) => {
    setCurrentRating(score);
    setChatHistory(prev => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[0] = {
        ...updated[0],
        rating: { score },
      };
      return updated;
    });
  };

  const clearHistory = () => {
    setChatHistory([]);
    localStorage.removeItem('chatHistory');
  };

  const loadHistoryItem = (item: ChatHistoryItem) => {
    setPrompt(item.prompt);
    setSelectedModel(item.model);
    setResult(item.result);
    setCurrentRating(item.rating?.score || null);
    setShowHistory(false);
  };

  const renderRatingStars = (rating: number | undefined) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              (rating || 0) >= star
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-400'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-950">
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Command className="w-8 h-8 text-purple-400" />
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
                Omni AI
              </span>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <History className="w-5 h-5 text-purple-400" />
              <span className="text-gray-200">History</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <>
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 mb-4">
              One Platform, Infinite Possibilities
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto">
              Access multiple AI models through a single, powerful interface. Transform your ideas into reality with Omni AI.
            </p>
          </div>

          <div className="bg-black/30 rounded-2xl p-6 backdrop-blur-xl border border-white/10 focus:outline-none">
            <div className="relative">
              <CustomSelectionButton
                selectedAIModel={selectedModel}
                setSelectedAIModel={setSelectedModel}
              />
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-32 bg-transparent text-white placeholder-gray-400 border-none focus:ring-2 focus:ring-purple-400 rounded-xl resize-none p-4 focus:outline-none"
                placeholder="Enter your prompt here..."
              />
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || isGenerating}
                className={`absolute bottom-4 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${
                  !prompt.trim() || isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'
                }`}
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Generate</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-8 bg-black/30 rounded-2xl p-6 backdrop-blur-xl border border-white/10 min-h-[200px]">
            {result ? (
              <div>
                <div className="text-gray-200 whitespace-pre-wrap mb-6">
                  <MarkdownRenderer content={result}/>
                </div>
                <div className='w-full py-4 flex items-center justify-end'>
                  <div className='text-gray-200 whitespace-nowrap px-4 text-base'>{selectedModel === 'auto' ? selectedModel :'Gemini'}</div>
                </div>
                <div className="border-t border-white/10 pt-6">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-300">Rate this response:</span>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          onClick={() => handleRating(score)}
                          className={`p-2 rounded-lg transition-colors ${
                            currentRating === score
                              ? 'bg-purple-500/30 text-purple-400'
                              : 'bg-white/5 text-gray-400 hover:bg-white/10'
                          }`}
                        >
                          <Star className={`w-5 h-5 ${
                            currentRating && score <= currentRating
                              ? 'fill-yellow-400 text-yellow-400'
                              : ''
                          }`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-400 flex flex-col items-center justify-center h-full">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-400" />
                <p>Your AI-generated content will appear here</p>
              </div>
            )}
          </div>
        </>
      </main>
    </div>
  );
}

const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      // className="prose prose-invert max-w-none"
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        a: ({ node, ...props }) => (
          <a {...props} className="text-purple-400 hover:text-purple-300 underline" target="_blank" rel="noopener noreferrer" />
        ),
        code: ({ node, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '')
          return match ? (
            <div className="bg-gray-900 rounded-lg p-4 my-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-sm">{match[1]}</span>
              </div>
              <code className={className} {...props}>
                {children}
              </code>
            </div>
          ) : (
            <code className="bg-gray-800 px-2 py-1 rounded text-pink-400" {...props}>
              {children}
            </code>
          )
        }
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export default App;