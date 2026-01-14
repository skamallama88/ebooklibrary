import React, { useState, useEffect } from 'react';
import api from '../api';
import type { AIPromptTemplate } from '../types';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

const AITemplateManager: React.FC = () => {
    const [templates, setTemplates] = useState<AIPromptTemplate[]>([]);
    const [editing, setEditing] = useState<AIPromptTemplate | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState<Partial<AIPromptTemplate>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/ai/templates/');
            setTemplates(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (tmpl: AIPromptTemplate) => {
        setEditing(tmpl);
        setFormData({...tmpl});
        setIsCreating(false);
        setError('');
    };

    const handleCreate = () => {
        setEditing(null);
        setFormData({ type: 'summary', is_default: false });
        setIsCreating(true);
        setError('');
    };

    const handleSave = async () => {
        if (!formData.name || !formData.template) {
            setError('Name and Content are required');
            return;
        }
        setLoading(true);
        try {
            if (isCreating) {
                await api.post('/ai/templates/', formData);
            } else if (editing) {
                await api.put(`/ai/templates/${editing.id}`, formData);
            }
            await fetchTemplates(); // Wait for fetch
            setEditing(null);
            setIsCreating(false);
            setFormData({});
        } catch (err: unknown) {
            console.error(err);
            const errorMessage = ((err as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to save template';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };
    
    const handleDelete = async (id: number) => {
        if (!window.confirm("Delete this template?")) return;
        try {
            await api.delete(`/ai/templates/${id}`);
            fetchTemplates();
        } catch (err) {
            console.error(err);
        }
    };

    if (isCreating || editing) {
        return (
            <div className="space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                        {isCreating ? 'New Template' : 'Edit Template'}
                    </h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleSave} 
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                        <button 
                            onClick={() => {setIsCreating(false); setEditing(null)}} 
                            className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-lg text-sm transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
                
                {error && <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm">{error}</div>}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                        <input className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                               value={formData.name || ''} 
                               onChange={e => setFormData({...formData, name: e.target.value})} 
                               placeholder="e.g. Creative Summary" />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
                        <select className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                value={formData.type || 'summary'}
                                onChange={e => setFormData({...formData, type: e.target.value})}>
                            <option value="summary">Summary</option>
                            <option value="tags">Tags</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                        <input className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                               value={formData.description || ''} 
                               onChange={e => setFormData({...formData, description: e.target.value})}
                               placeholder="Brief description of what this prompt does" />
                    </div>

                    <div className="flex items-center">
                        <input type="checkbox" id="is_default" 
                               checked={formData.is_default || false}
                               onChange={e => setFormData({...formData, is_default: e.target.checked})}
                               className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                        <label htmlFor="is_default" className="ml-2 text-sm text-slate-700 dark:text-slate-300">Set as default for this type</label>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content</label>
                        <textarea className="w-full border rounded-lg px-3 py-2 h-96 font-mono text-xs md:text-sm bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                               value={formData.template || ''} 
                               onChange={e => setFormData({...formData, template: e.target.value})} />
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded">
                            <span className="font-semibold">Available variables:</span>
                            {formData.type === 'summary' 
                                ? ' {book_title}, {authors}, {existing_summary}, {book_content}, {word_count}' 
                                : ' {book_title}, {authors}, {existing_tags}, {current_tags}, {tag_limits}, {book_sample}, {popular_tags}'}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                 <div>
                     <h3 className="text-lg font-medium text-slate-900 dark:text-white">AI Prompt Templates</h3>
                     <p className="text-sm text-slate-500">Customize how AI generates summaries and tags.</p>
                 </div>
                 <button onClick={handleCreate} className="flex items-center gap-1 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors shadow-sm">
                     <PlusIcon className="w-4 h-4" /> New Template
                 </button>
             </div>
             
             <div className="space-y-3">
                 {templates.map(t => (
                     <div key={t.id} className="border dark:border-slate-700 p-4 rounded-lg flex justify-between items-center hover:border-slate-300 dark:hover:border-slate-600 transition-colors bg-white dark:bg-slate-800">
                         <div>
                             <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                 {t.name}
                                 {t.is_default && <span className="text-[10px] uppercase tracking-wider bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">Default</span>}
                             </div>
                             <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                                <span className="uppercase text-[10px] font-bold bg-slate-100 dark:bg-slate-700 px-1.5 rounded text-slate-600 dark:text-slate-400">{t.type}</span>
                                {t.description && <span>{t.description}</span>}
                             </div>
                         </div>
                         <div className="flex gap-2">
                             <button onClick={() => handleEdit(t)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors group" title="Edit">
                                 <PencilIcon className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                             </button>
                             {/* Allow deleting any template, but maybe warn if it's default? Logic handles it. */}
                             <button onClick={() => handleDelete(t.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group" title="Delete">
                                 <TrashIcon className="w-4 h-4 text-slate-400 group-hover:text-red-500" />
                             </button>
                         </div>
                     </div>
                 ))}
                 
                 {templates.length === 0 && (
                     <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                         No templates found. Create one to get started.
                     </div>
                 )}
             </div>
        </div>
    );
}

export default AITemplateManager;
