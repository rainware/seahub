import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { getTasks } from '../lib/api';
import { type Task } from '../types';
import { Activity, Clock, Calendar, ArrowRight } from 'lucide-react';

const TaskList: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>([]);

    useEffect(() => {
        getTasks()
            .then(response => {
                setTasks(response.data);
            })
            .catch(error => {
                console.error("Error fetching Tasks:", error);
            });
    }, []);

    const getStatusColor = (state: string) => {
        switch (state) {
            case 'SUCCESS': return 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-emerald-100';
            case 'ERROR': return 'bg-rose-100 text-rose-700 border-rose-200 shadow-rose-100';
            case 'PROCESSING': return 'bg-sky-100 text-sky-700 border-sky-200 shadow-sky-100 animate-pulse';
            case 'PENDING': return 'bg-slate-100 text-slate-600 border-slate-200';
            default: return 'bg-slate-100 text-slate-600 border-slate-200';
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-600 to-cyan-500 bg-clip-text text-transparent drop-shadow-sm">
                    Task Execution
                </h1>
                <p className="text-slate-500 mt-1">Monitor your running and completed tasks</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {tasks.map(task => (
                    <div key={task.id} className="glass-card rounded-2xl p-6 flex items-center justify-between group">
                        <div className="flex items-center gap-6">
                            <div className={`p-3 rounded-full ${getStatusColor(task.state).split(' ')[0]} border border-white/60`}>
                                <Activity className="w-6 h-6" />
                            </div>

                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-lg font-bold text-slate-700 group-hover:text-sky-600 transition-colors">
                                        {task.title}
                                    </h3>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm ${getStatusColor(task.state)}`}>
                                        {task.state_display || task.state}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <span className="font-mono text-sky-600/80">#{task.id}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="text-slate-400">DAG:</span>
                                        <span className="text-slate-600 font-medium">{task.dag?.name}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            <div className="text-right hidden md:block">
                                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                                    <Clock className="w-4 h-4 text-sky-400" />
                                    <span>{task.duration}s</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(task.start_time).toLocaleString()}</span>
                                </div>
                            </div>

                            <Link to={`/tasks/${task.id}`}>
                                <Button className="bg-white hover:bg-sky-50 text-slate-400 hover:text-sky-600 border border-slate-200 hover:border-sky-200 transition-all rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-sm">
                                    <ArrowRight className="w-5 h-5" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TaskList;
