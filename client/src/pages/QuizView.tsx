import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Question {
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
}

interface QuizViewProps {
    content: string;
    onComplete?: (passed: boolean) => void;
}

export const QuizView: React.FC<QuizViewProps> = ({ content, onComplete }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [score, setScore] = useState(0);
    const [showResults, setShowResults] = useState(false);

    let questions: Question[] = [];
    try {
        questions = JSON.parse(content);
    } catch {
        return <div className="text-red-500">Error loading quiz data.</div>;
    }

    const currentQuestion = questions[currentQuestionIndex];

    const handleOptionClick = (index: number) => {
        if (isAnswered) return;
        setSelectedOption(index);
    };

    const handleSubmit = () => {
        if (selectedOption === null) return;

        const isCorrect = selectedOption === currentQuestion.correctAnswer;
        if (isCorrect) setScore(score + 1);
        setIsAnswered(true);
    };

    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setSelectedOption(null);
            setIsAnswered(false);
        } else {
            setShowResults(true);
            // Calculate final score logic
            // NOTE: The score update is async, so using calculation here or effect is better. 
            // Simplified: we used score state which updated on submit.
            // Actually, handleNext is called AFTER submit.

            const percentage = Math.round((score / questions.length) * 100);
            if (percentage >= 70 && onComplete) {
                onComplete(true);
            }
        }
    };

    if (showResults) {
        const percentage = Math.round((score / questions.length) * 100);
        return (
            <div className="bg-black/50 border border-hackon-green/30 p-8 rounded-lg text-center animate-fade-in">
                <h3 className="text-3xl font-orbitron text-white mb-4">Mission Debrief</h3>
                <div className="text-6xl font-bold mb-6 text-hackon-green">
                    {percentage}%
                </div>
                <p className="text-gray-400 mb-8">
                    {percentage >= 70 ? "Perfect Execution. You comprise the elite." : "Mission parameters partially met. Review intel and retry."}
                </p>
                <button
                    onClick={() => {
                        setCurrentQuestionIndex(0);
                        setSelectedOption(null);
                        setIsAnswered(false);
                        setScore(0);
                        setShowResults(false);
                    }}
                    className="hackon-button px-6 py-2 rounded font-bold"
                >
                    Retake Protocol
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-sm text-gray-400 font-mono">
                <span>VECTOR {currentQuestionIndex + 1} OF {questions.length}</span>
                <span>SCORE: {score}</span>
            </div>

            <div className="bg-black/30 border border-white/10 p-6 rounded-lg">
                <h3 className="text-xl text-white mb-6 font-semibold">{currentQuestion.question}</h3>

                <div className="space-y-3">
                    {currentQuestion.options.map((option, index) => {
                        let optionClass = "w-full text-left p-4 rounded border transition-all duration-200 ";

                        if (isAnswered) {
                            if (index === currentQuestion.correctAnswer) {
                                optionClass += "bg-green-900/40 border-green-500 text-white";
                            } else if (index === selectedOption) {
                                optionClass += "bg-red-900/40 border-red-500 text-white";
                            } else {
                                optionClass += "bg-black/20 border-white/5 text-gray-500";
                            }
                        } else {
                            if (selectedOption === index) {
                                optionClass += "bg-hackon-green/20 border-hackon-green text-white";
                            } else {
                                optionClass += "bg-black/20 border-white/10 text-gray-300 hover:bg-white/5 hover:border-white/30";
                            }
                        }

                        return (
                            <button
                                key={index}
                                onClick={() => handleOptionClick(index)}
                                disabled={isAnswered}
                                className={optionClass}
                            >
                                <div className="flex items-center">
                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center mr-3 ${isAnswered && index === currentQuestion.correctAnswer ? "border-green-500 bg-green-500/20 text-green-500" :
                                        isAnswered && index === selectedOption ? "border-red-500 bg-red-500/20 text-red-500" :
                                            selectedOption === index ? "border-hackon-green text-hackon-green" :
                                                "border-gray-600 text-gray-600"
                                        }`}>
                                        {['A', 'B', 'C', 'D'][index]}
                                    </div>
                                    {option}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {isAnswered && currentQuestion.explanation && (
                <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded text-blue-200 text-sm flex gap-3">
                    <AlertTriangle className="shrink-0 w-5 h-5 text-blue-400" />
                    <div>
                        <strong className="block text-blue-400 mb-1">Intel Analysis:</strong>
                        {currentQuestion.explanation}
                    </div>
                </div>
            )}

            <div className="flex justify-end pt-4">
                {!isAnswered ? (
                    <button
                        onClick={handleSubmit}
                        disabled={selectedOption === null}
                        className="hackon-button px-8 py-2 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        LOCK IN
                    </button>
                ) : (
                    <button
                        onClick={handleNext}
                        className="hackon-button px-8 py-2 rounded font-bold"
                    >
                        {currentQuestionIndex < questions.length - 1 ? "NEXT VECTOR" : "FINISH BRIEFING"}
                    </button>
                )}
            </div>
        </div>
    );
};
