'use client';

import { useState, useEffect } from 'react';
import { Quote } from 'lucide-react';

const quotes = [
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" }
];

export default function QuoteWidget() {
    const [quote, setQuote] = useState(quotes[0]);

    useEffect(() => {
        // Pick a random quote on mount (client-side only to avoid hydration mismatch)
        setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, []);

    return (
        <div className="bg-surface/50 border border-white/5 rounded-xl p-4 max-w-md backdrop-blur-sm">
            <div className="flex gap-3">
                <Quote size={20} className="text-accent-blue flex-shrink-0 opacity-80" />
                <div>
                    <p className="text-sm text-text-primary italic mb-1.5 leading-relaxed">
                        "{quote.text}"
                    </p>
                    <p className="text-xs text-text-secondary font-medium">
                        — {quote.author}
                    </p>
                </div>
            </div>
        </div>
    );
}
