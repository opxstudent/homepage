'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase-client';
import { ExternalLink, Plus, Trash2, Edit2 } from 'lucide-react';

interface QuickLink {
    id: string;
    title: string;
    url: string;
    image_url: string | null;
    category: string;
}

export default function QuickLinks() {
    const [links, setLinks] = useState<QuickLink[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [editingLink, setEditingLink] = useState<QuickLink | null>(null);
    const [formData, setFormData] = useState({ title: '', url: '', image_url: '', category: 'frequent' });

    useEffect(() => {
        fetchLinks();
    }, []);

    async function fetchLinks() {
        const { data } = await supabase
            .from('quick_links')
            .select('*')
            .order('created_at', { ascending: true });

        if (data) setLinks(data);
    }

    async function handleSave() {
        if (!formData.title || !formData.url) return;

        const payload = {
            title: formData.title,
            url: formData.url,
            image_url: formData.image_url || null,
            category: formData.category,
        };

        let error;
        if (editingLink) {
            const { error: updateError } = await supabase
                .from('quick_links')
                .update(payload)
                .eq('id', editingLink.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('quick_links')
                .insert(payload);
            error = insertError;
        }

        if (!error) {
            resetForm();
            fetchLinks();
        }
    }

    function resetForm() {
        setFormData({ title: '', url: '', image_url: '', category: 'frequent' });
        setIsAdding(false);
        setEditingLink(null);
    }

    function startEdit(link: QuickLink) {
        setEditingLink(link);
        setFormData({
            title: link.title,
            url: link.url,
            image_url: link.image_url || '',
            category: link.category,
        });
        setIsAdding(true);
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this link?')) return;
        await supabase.from('quick_links').delete().eq('id', id);
        fetchLinks();
    }

    // Group links by category
    const groupedLinks = links.reduce((acc, link) => {
        if (!acc[link.category]) {
            acc[link.category] = [];
        }
        acc[link.category].push(link);
        return acc;
    }, {} as Record<string, QuickLink[]>);

    const categoryOrder = ['frequent', 'other'];
    const categoryLabels: Record<string, string> = {
        frequent: 'Frequent',
        other: 'Other',
    };

    return (
        <div className="bg-surface rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-white">Quick Links</h3>
                <button
                    onClick={() => {
                        if (isAdding) resetForm();
                        else setIsAdding(true);
                    }}
                    className="p-1.5 bg-accent-blue hover:bg-accent-blue/90 rounded-lg transition-all"
                >
                    <Plus size={14} className={`text-white transition-transform ${isAdding ? 'rotate-45' : ''}`} />
                </button>
            </div>

            {/* Link Form (Add or Edit) */}
            {isAdding && (
                <div className="mb-4 p-3 bg-active rounded-lg space-y-2 border border-white/5">
                    <p className="text-[10px] uppercase font-bold text-text-secondary px-1">
                        {editingLink ? 'Edit Link' : 'Add New Link'}
                    </p>
                    <input
                        type="text"
                        placeholder="Title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="w-full bg-background rounded px-2 py-1 text-xs text-text-primary border border-white/5 focus:border-accent-blue outline-none transition-colors"
                    />
                    <input
                        type="text"
                        placeholder="URL"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        className="w-full bg-background rounded px-2 py-1 text-xs text-text-primary border border-white/5 focus:border-accent-blue outline-none transition-colors"
                    />
                    <input
                        type="text"
                        placeholder="Image URL (optional)"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        className="w-full bg-background rounded px-2 py-1 text-xs text-text-primary border border-white/5 focus:border-accent-blue outline-none transition-colors"
                    />
                    <div className="flex gap-2">
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="bg-background rounded px-2 py-1 text-xs text-text-primary border border-white/5 focus:border-accent-blue outline-none transition-colors flex-1"
                        >
                            <option value="frequent">Frequent</option>
                            <option value="other">Other</option>
                        </select>
                        <button
                            onClick={handleSave}
                            className="bg-accent-blue hover:bg-accent-blue/90 text-white text-xs px-4 py-1.5 rounded font-medium transition-colors"
                        >
                            {editingLink ? 'Update' : 'Add'}
                        </button>
                    </div>
                </div>
            )}

            {/* Categories in vertical columns */}
            <div className="grid grid-cols-2 gap-4">
                {categoryOrder.map((category) => {
                    const categoryLinks = groupedLinks[category] || [];

                    return (
                        <div key={category}>
                            <h4 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 px-1">
                                {categoryLabels[category]}
                            </h4>
                            <div className="grid grid-cols-2 gap-1.5">
                                {categoryLinks.map((link) => (
                                    <div key={link.id} className="group relative">
                                        <a
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-active hover:bg-[#323234] rounded-md p-2.5 flex flex-col items-center justify-center gap-1.5 transition-all h-full"
                                            title={link.title}
                                        >
                                            <div className="w-6 h-6 flex items-center justify-center">
                                                {link.image_url ? (
                                                    <img
                                                        src={link.image_url}
                                                        alt={link.title}
                                                        className="w-full h-full object-contain"
                                                    />
                                                ) : (
                                                    <ExternalLink size={16} className="text-text-secondary" />
                                                )}
                                            </div>
                                            <span className="text-[10px] text-text-secondary group-hover:text-text-primary transition-colors text-center line-clamp-1 w-full px-1">
                                                {link.title}
                                            </span>
                                        </a>
                                        <div className="absolute top-0.5 right-0.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    startEdit(link);
                                                }}
                                                className="bg-accent-blue hover:bg-accent-blue/90 rounded-md p-1 group/btn shadow-lg"
                                                title="Edit Link"
                                            >
                                                <Edit2 size={8} className="text-white" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleDelete(link.id);
                                                }}
                                                className="bg-red-500 hover:bg-red-600 rounded-md p-1 group/btn shadow-lg"
                                                title="Delete Link"
                                            >
                                                <Trash2 size={8} className="text-white" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
