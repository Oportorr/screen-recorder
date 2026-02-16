'use client';

import { useState } from 'react';
import { generateVideoSummary } from '@/app/actions';
import { Sparkles, Loader2 } from 'lucide-react';

interface SummaryData {
    title: string;
    summary: string;
    tags: string[];
}

export default function VideoSummary({ playbackId }: { playbackId: string }) {
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(false);

        const result = await generateVideoSummary(playbackId);

        if (result) {
            setSummary(result);
        } else {
            setError(true);
        }

        setIsGenerating(false);
    };

  if (summary) {
    return (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-2">{summary.title}</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">{summary.summary}</p>
            <div className="flex flex-wrap gap-2">
            {summary.tags.map((tag) => (
                <span 
                key={tag} 
                className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-xs font-medium"
                >
                #{tag}
                </span>
            ))}
            </div>
        </div>
    );
  }

  return (
    <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg font-medium transition"
    >
        {isGenerating ? (
            <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing Video...
            </>
        ) : error ? (
            'Try Again'
        ) : (
            <>
            <Sparkles className="w-4 h-4" />
            Generate AI Summary
            </>
        )}
    </button>
  );
}