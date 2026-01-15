
import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Brain, Timer, CheckCircle, XCircle, Volume2, VolumeX, ArrowRight, Loader2, Sparkles, Award } from 'lucide-react';

interface Question {
    q: string;
    options: string[];
    answer: string;
    explanation: string;
}

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const Quiz: React.FC = () => {
    const [gameState, setGameState] = useState<'start' | 'loading' | 'quiz' | 'completed'>('start');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
    const [showExplanation, setShowExplanation] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchQuestions = async (diff: string) => {
        setGameState('loading');
        const prompt = `Generate 5 multiple-choice questions about Agriculture technology (AgriTech) for a ${diff} level.
    Focus on:
    - Current affairs in agriculture (e.g., new government schemes, policies).
    - Modern AgriTech innovations (drones, AI, IOT).
    - Seasonal crops and farming practices.
    
    Return ONLY a raw JSON array. Do not include markdown formatting like \`\`\`json. 
    Each object should have:
    - "q": string (the question)
    - "options": array of 4 strings
    - "answer": string (must match one of the options exactly)
    - "explanation": string (short explanation of the answer)
    
    Example structure:
    [
      {
        "q": "Question text?",
        "options": ["A", "B", "C", "D"],
        "answer": "A",
        "explanation": "Because..."
      }
    ]`;

        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: "You are a helpful quiz generator. Always respond with valid JSON." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error("Failed to fetch questions");
            }

            const data = await response.json();
            const text = data.choices[0].message.content;
            const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const fetchedQuestions = JSON.parse(jsonString);

            setQuestions(fetchedQuestions);
            setGameState('quiz');
            setCurrentIndex(0);
            setScore(0);
            setCorrectCount(0);
            setWrongCount(0);
        } catch (error) {
            console.error("Error fetching questions:", error);
            alert("Failed to load questions. Please try again.");
            setGameState('start');
        }
    };

    useEffect(() => {
        if (gameState === 'quiz' && questions.length > 0) {
            startQuestion();
        }
        return () => stopTimer();
    }, [currentIndex, gameState]);

    const startQuestion = () => {
        setTimeLeft(60);
        setSelectedOption(null);
        setShowExplanation(false);
        startTimer();

        // Voice
        if (isVoiceEnabled) {
            const q = questions[currentIndex];
            speakText(`${q.q}. Options are: ${q.options.join(", ")}`);
        }
    };

    const startTimer = () => {
        stopTimer();
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    stopTimer();
                    handleNext();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const selectAnswer = (opt: string) => {
        if (selectedOption !== null) return;
        stopTimer();
        setSelectedOption(opt);
        setShowExplanation(true);

        const correct = questions[currentIndex].answer;
        if (opt === correct) {
            setScore(s => s + 10);
            setCorrectCount(c => c + 1);
            speakText("Correct! " + questions[currentIndex].explanation);
        } else {
            setWrongCount(w => w + 1);
            speakText("Incorrect. " + questions[currentIndex].explanation);
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            setGameState('completed');
        }
    };

    const speakText = (text: string) => {
        if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
    };

    const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

    return (
        <div className="max-w-4xl mx-auto mt-8 px-4">
            {gameState === 'start' && (
                <div className="bg-white rounded-3xl shadow-2xl p-10 text-center border border-slate-100 animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-agri-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Trophy className="w-12 h-12 text-agri-green" />
                    </div>
                    <h1 className="text-4xl font-black text-slate-800 mb-4 tracking-tight uppercase">AgriTech MasterMind</h1>
                    <p className="text-slate-500 mb-10 text-lg max-w-lg mx-auto leading-relaxed">
                        Test your knowledge on modern farming, IOT innovations, and latest agricultural schemes.
                        Earn points and become a certified AgriTech expert!
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        {(['easy', 'medium', 'hard'] as const).map((lvl) => (
                            <button
                                key={lvl}
                                onClick={() => setDifficulty(lvl)}
                                className={`p-4 rounded-2xl border-2 transition-all font-bold uppercase tracking-widest text-sm ${difficulty === lvl ? 'border-agri-green bg-agri-green/5 text-agri-green' : 'border-slate-100 text-slate-400 hover:border-slate-200'
                                    }`}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => fetchQuestions(difficulty)}
                        className="w-full bg-agri-green text-white font-black py-5 rounded-2xl hover:bg-green-800 transition-all shadow-xl shadow-green-200 active:scale-[0.98] text-lg uppercase tracking-widest flex items-center justify-center gap-3"
                    >
                        Start Quiz <ArrowRight className="w-6 h-6" />
                    </button>
                </div>
            )}

            {gameState === 'loading' && (
                <div className="bg-white rounded-3xl shadow-2xl p-20 text-center border border-slate-100">
                    <Loader2 className="w-16 h-16 text-agri-green animate-spin mx-auto mb-6" />
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Generating Your Quiz</h2>
                    <p className="text-slate-400 mt-2 font-medium">Bhoomi AI is crafting specialized questions for you...</p>
                </div>
            )}

            {gameState === 'quiz' && questions.length > 0 && (
                <div className="space-y-6 animate-in slide-in-from-bottom-10 duration-500">
                    {/* Header Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                                <Brain className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Score</p>
                                <p className="text-lg font-black text-slate-800 leading-none">{score}</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Correct</p>
                                <p className="text-lg font-black text-slate-800 leading-none">{correctCount}</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                                <XCircle className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">Wrong</p>
                                <p className="text-lg font-black text-slate-800 leading-none">{wrongCount}</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3 relative overflow-hidden">
                            <div className="w-10 h-10 bg-yellow-50 rounded-full flex items-center justify-center z-10">
                                <Timer className="w-5 h-5 text-yellow-600" />
                            </div>
                            <div className="z-10">
                                <p className="text-[10px] font-black text-slate-400 uppercase">Time</p>
                                <p className="text-lg font-black text-slate-800 leading-none">{timeLeft}s</p>
                            </div>
                            <div className="absolute bottom-0 left-0 h-1 bg-yellow-400 transition-all duration-1000" style={{ width: `${(timeLeft / 60) * 100}%` }}></div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-agri-green transition-all duration-500" style={{ width: `${progress}%` }}></div>
                    </div>

                    {/* Question Card */}
                    <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
                        <div className="flex justify-between items-center mb-6">
                            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Question {currentIndex + 1} of {questions.length}</span>
                            <button
                                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                                className={`p-2 rounded-full transition-colors ${isVoiceEnabled ? 'bg-agri-green/10 text-agri-green' : 'bg-slate-100 text-slate-400'}`}
                            >
                                {isVoiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                            </button>
                        </div>

                        <h2 className="text-2xl font-bold text-slate-800 mb-8 leading-tight">{questions[currentIndex].q}</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {questions[currentIndex].options.map((opt, i) => {
                                let statusClass = "border-slate-100 hover:border-agri-green hover:bg-agri-green/5";
                                if (selectedOption !== null) {
                                    if (opt === questions[currentIndex].answer) statusClass = "border-green-500 bg-green-50 text-green-700 font-bold";
                                    else if (opt === selectedOption) statusClass = "border-red-400 bg-red-50 text-red-600";
                                    else statusClass = "border-slate-100 opacity-50 grayscale";
                                }

                                return (
                                    <button
                                        key={i}
                                        disabled={selectedOption !== null}
                                        onClick={() => selectAnswer(opt)}
                                        className={`p-5 rounded-2xl border-2 text-left transition-all flex items-center justify-between group ${statusClass}`}
                                    >
                                        <span>{opt}</span>
                                        {selectedOption !== null && opt === questions[currentIndex].answer && <CheckCircle className="w-5 h-5 text-green-500" />}
                                        {selectedOption === opt && opt !== questions[currentIndex].answer && <XCircle className="w-5 h-5 text-red-500" />}
                                    </button>
                                );
                            })}
                        </div>

                        {showExplanation && (
                            <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-blue-500" />
                                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Explanation</span>
                                </div>
                                <p className="text-sm text-blue-800 leading-relaxed italic">{questions[currentIndex].explanation}</p>
                            </div>
                        )}

                        {selectedOption !== null && (
                            <button
                                onClick={handleNext}
                                className="mt-8 w-full bg-slate-900 text-white font-black py-4 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                            >
                                {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'} <ArrowRight className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {gameState === 'completed' && (
                <div className="bg-white rounded-3xl shadow-2xl p-12 text-center border border-slate-100 animate-in zoom-in duration-500">
                    <div className="w-32 h-32 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                        <Award className="w-16 h-16 text-yellow-600 animate-bounce" />
                        <div className="absolute inset-0 rounded-full border-4 border-yellow-200 border-t-yellow-600 animate-spin" style={{ animationDuration: '3s' }}></div>
                    </div>
                    <h1 className="text-4xl font-black text-slate-800 mb-2 uppercase tracking-tight">Level Complete!</h1>
                    <p className="text-slate-400 font-bold mb-10 tracking-widest uppercase text-sm">You are an AgriTech Pioneer</p>

                    <div className="grid grid-cols-3 gap-4 mb-10">
                        <div className="p-4 bg-slate-50 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Score</p>
                            <p className="text-3xl font-black text-agri-green">{score}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Accuracy</p>
                            <p className="text-3xl font-black text-blue-600">{Math.round((correctCount / questions.length) * 100)}%</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Mistakes</p>
                            <p className="text-3xl font-black text-red-500">{wrongCount}</p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setGameState('start')}
                            className="flex-1 bg-agri-green text-white font-black py-5 rounded-2xl hover:bg-green-800 transition-all shadow-xl shadow-green-200 active:scale-[0.98] uppercase tracking-widest"
                        >
                            Play Again
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="flex-1 bg-white border-2 border-slate-100 text-slate-800 font-black py-5 rounded-2xl hover:bg-slate-50 transition-all active:scale-[0.98] uppercase tracking-widest"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Quiz;
