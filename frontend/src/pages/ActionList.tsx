import React, { useEffect, useState } from 'react';
import { getActions, createAction, deleteAction } from '../lib/api';
import type { Action } from '../types';
import { Button } from '@/components/ui/button';
import { Terminal, Trash2, Plus, Upload, Code, ChevronDown } from 'lucide-react';

const ActionList: React.FC = () => {
    const [actions, setActions] = useState<Action[]>([]);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(5);
    const [totalCount, setTotalCount] = useState(0);
    const [expandedActions, setExpandedActions] = useState<Set<number>>(new Set());
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newAction, setNewAction] = useState({
        name: '',
        title: '',
        type: 'default',
        func: '',
        input_def: '{}',
        output_def: '{}'
    });
    const [loading, setLoading] = useState(false);

    const fetchActions = async () => {
        try {
            const response = await getActions({ page, page_size: pageSize });
            setActions(response.data.results);
            setTotalCount(response.data.count);
        } catch (error) {
            console.error('Failed to fetch actions:', error);
        }
    };

    useEffect(() => {
        fetchActions();
    }, [page]);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this action?')) return;
        try {
            await deleteAction(id);
            fetchActions();
        } catch (error) {
            console.error('Failed to delete action:', error);
            alert('Failed to delete action');
        }
    };

    const handleCreate = async () => {
        setLoading(true);
        try {
            const payload = {
                ...newAction,
                input_def: JSON.parse(newAction.input_def),
                output_def: JSON.parse(newAction.output_def)
            };
            await createAction(payload);
            setIsCreateModalOpen(false);
            setNewAction({ name: '', title: '', type: 'default', func: '', input_def: '{}', output_def: '{}' });
            fetchActions();
        } catch (error) {
            console.error('Failed to create action:', error);
            alert('Failed to create action. Please check your JSON format.');
        } finally {
            setLoading(false);
        }
    };

    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [batchJson, setBatchJson] = useState('');

    const handleBatchCreate = async () => {
        setLoading(true);
        try {
            const payload = JSON.parse(batchJson);
            if (!Array.isArray(payload)) {
                throw new Error('Input must be a JSON array');
            }
            await createAction(payload);
            setIsBatchModalOpen(false);
            setBatchJson('');
            fetchActions();
        } catch (error: any) {
            console.error('Failed to batch create actions:', error);
            const errorMessage = error.response?.data ? JSON.stringify(error.response.data) : error.message;
            alert(`Failed to create actions: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (actionId: number) => {
        setExpandedActions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(actionId)) {
                newSet.delete(actionId);
            } else {
                newSet.add(actionId);
            }
            return newSet;
        });
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-600 to-cyan-500 bg-clip-text text-transparent drop-shadow-sm">
                        Action Library
                    </h1>
                    <p className="text-slate-500 mt-1">Manage reusable action definitions</p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setIsBatchModalOpen(true)}
                        className="border-sky-200 hover:bg-sky-50 hover:text-sky-600 text-slate-600"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Batch Import
                    </Button>
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-200"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Action
                    </Button>
                </div>
            </div>

            <div className="grid gap-4">
                {actions.map(action => {
                    const isExpanded = expandedActions.has(action.id);
                    return (
                        <div key={action.id} className="glass-card rounded-2xl p-6 group">
                            <div className={`flex items-start justify-between ${isExpanded ? 'mb-4' : ''}`}>
                                <div
                                    className="flex items-center gap-4 flex-1 cursor-pointer"
                                    onClick={() => toggleExpand(action.id)}
                                >
                                    <div className={`p-3 rounded-xl ${action.type === 'external' ? 'bg-orange-100 text-orange-600' :
                                        action.type === 'carrier' ? 'bg-purple-100 text-purple-600' :
                                            'bg-sky-100 text-sky-600'
                                        }`}>
                                        <Terminal className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold text-slate-700 group-hover:text-sky-600 transition-colors">
                                                {action.title || action.name}
                                            </h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${action.type === 'external' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                                action.type === 'carrier' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                                    'bg-sky-50 text-sky-600 border-sky-200'
                                                }`}>
                                                {action.type || 'default'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 font-mono mt-1">{action.name}</p>
                                    </div>
                                    <ChevronDown
                                        className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(action.id);
                                    }}
                                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 ml-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>

                            {isExpanded && (
                                <div className="space-y-4 pl-[4.5rem] animate-in slide-in-from-top-2 duration-200">
                                    {action.type !== 'external' && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 font-mono">
                                            <Code className="w-4 h-4 text-slate-400" />
                                            {action.func}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Input Definition</h4>
                                            <pre className="bg-slate-50 border border-slate-200 p-3 rounded-xl overflow-auto max-h-40 text-xs font-mono text-slate-600">
                                                {JSON.stringify(action.input_def, null, 2)}
                                            </pre>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Output Definition</h4>
                                            <pre className="bg-slate-50 border border-slate-200 p-3 rounded-xl overflow-auto max-h-40 text-xs font-mono text-slate-600">
                                                {JSON.stringify(action.output_def, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-slate-500">
                    Showing {actions.length} of {totalCount} results
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm text-slate-600 font-medium">
                        Page {page} of {Math.max(1, Math.ceil(totalCount / pageSize))}
                    </span>
                    <Button
                        variant="outline"
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= Math.ceil(totalCount / pageSize)}
                        className="border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                        Next
                    </Button>
                </div>
            </div>

            {isBatchModalOpen && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="glass-panel p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/60 shadow-2xl">
                        <h2 className="text-2xl font-bold mb-4 text-slate-700">Batch Create Actions</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-600">JSON Input (Array of Actions)</label>
                                <textarea
                                    className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm h-96 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 text-slate-600"
                                    placeholder={`[\n  {\n    "name": "action1",\n    "title": "Action 1",\n    "type": "default",\n    "func": "path.to.func",\n    "input_def": {},\n    "output_def": {}\n  }\n]`}
                                    value={batchJson}
                                    onChange={e => setBatchJson(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button
                                variant="ghost"
                                onClick={() => setIsBatchModalOpen(false)}
                                className="hover:bg-slate-100 text-slate-500"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleBatchCreate}
                                disabled={loading}
                                className="bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-200"
                            >
                                {loading ? 'Creating...' : 'Batch Create'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
                    <div className="glass-panel p-6 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/60 shadow-2xl">
                        <h2 className="text-2xl font-bold mb-4 text-slate-700">Create New Action</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-600">Name</label>
                                    <input
                                        className="w-full bg-white/50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                        value={newAction.name}
                                        onChange={e => setNewAction({ ...newAction, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-600">Type</label>
                                    <select
                                        className="w-full bg-white/50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                        value={newAction.type}
                                        onChange={e => setNewAction({ ...newAction, type: e.target.value })}
                                    >
                                        <option value="default">Default</option>
                                        <option value="carrier">Carrier</option>
                                        <option value="external">External</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-600">Title</label>
                                <input
                                    className="w-full bg-white/50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                    value={newAction.title}
                                    onChange={e => setNewAction({ ...newAction, title: e.target.value })}
                                />
                            </div>

                            {newAction.type !== 'external' && (
                                <div>
                                    <label className="block text-sm font-medium mb-2 text-slate-600">Func (Python path)</label>
                                    <input
                                        className="w-full bg-white/50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                        value={newAction.func}
                                        onChange={e => setNewAction({ ...newAction, func: e.target.value })}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-600">Input Definition (JSON)</label>
                                <textarea
                                    className="w-full bg-white/50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-sm h-32 text-slate-700 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                    value={newAction.input_def}
                                    onChange={e => setNewAction({ ...newAction, input_def: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-600">Output Definition (JSON)</label>
                                <textarea
                                    className="w-full bg-white/50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-sm h-32 text-slate-700 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                                    value={newAction.output_def}
                                    onChange={e => setNewAction({ ...newAction, output_def: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <Button
                                variant="ghost"
                                onClick={() => setIsCreateModalOpen(false)}
                                className="hover:bg-slate-100 text-slate-500"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={loading}
                                className="bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-200"
                            >
                                {loading ? 'Creating...' : 'Create'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActionList;
