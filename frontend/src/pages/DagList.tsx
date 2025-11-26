import { getDags, createDag } from '../lib/api';

// ... imports

const DAGList: React.FC = () => {
    const [dags, setDags] = useState<Dag[]>([]);
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [batchJson, setBatchJson] = useState('');
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(20);
    const [totalCount, setTotalCount] = useState(0);

    const fetchDags = () => {
        getDags({ page, page_size: pageSize })
            .then(response => {
                setDags(response.data.results);
                setTotalCount(response.data.count);
            })
            .catch(error => {
                console.error("Error fetching DAGs:", error);
            });
    };

    useEffect(() => {
        fetchDags();
    }, [page]);

    // ... handleBatchCreate ...

    return (
        <div className="space-y-8">
            {/* ... Header ... */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-600 to-cyan-500 bg-clip-text text-transparent drop-shadow-sm">
                        DAG Definitions
                    </h1>
                    <p className="text-slate-500 mt-1">Manage your workflow definitions</p>
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
                    <Link to="/dags/create">
                        <Button className="bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-200">
                            <Plus className="w-4 h-4 mr-2" />
                            Create DAG
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dags.map(dag => (
                    <div key={dag.id} className="glass-card rounded-2xl p-6 flex flex-col justify-between h-48 group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <FileJson className="w-24 h-24 text-sky-600" />
                        </div>

                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-bold text-slate-700 group-hover:text-sky-600 transition-colors">
                                    {dag.title}
                                </h3>
                                <span className="text-xs font-mono bg-sky-100 text-sky-700 px-2 py-1 rounded-full border border-sky-200">
                                    v{dag.version}
                                </span>
                            </div>
                            <p className="text-sm text-slate-500 font-mono">{dag.name}</p>
                        </div>

                        <div className="mt-4">
                            <Link to={`/dags/${dag.id}`}>
                                <Button className="w-full bg-white hover:bg-sky-50 text-slate-600 hover:text-sky-600 border border-slate-200 hover:border-sky-200 transition-all shadow-sm">
                                    View Details
                                </Button>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-slate-500">
                    Showing {dags.length} of {totalCount} results
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
                        <h2 className="text-2xl font-bold mb-4 text-slate-700">Batch Import DAGs</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-slate-600">JSON Input (Array of DAG DSLs)</label>
                                <textarea
                                    className="w-full bg-white/50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm h-96 focus:outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 text-slate-600"
                                    placeholder={`[\n  {\n    "identifier": "dag_1",\n    "name": "dag_1",\n    "components": []\n  }\n]`}
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
                                {loading ? 'Importing...' : 'Import DAGs'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DAGList;
