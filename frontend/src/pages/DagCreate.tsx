import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
    addEdge,
    Background,
    Controls,
    type Connection,
    type Edge,
    type Node,
    useNodesState,
    useEdgesState,
    ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getActions, createDag } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const DagCreate: React.FC = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [dagName, setDagName] = useState('');
    const [dagTitle, setDagTitle] = useState('');
    const [actions, setActions] = useState<any[]>([]);
    const [selectedAction, setSelectedAction] = useState('');
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    interface NodeConfig {
        input_adapter: Record<string, string>;
        output_adapter: Record<string, string>;
        input_def: Record<string, any>;
        output_def: Record<string, any>;
        _tab?: string;
    }

    const [nodeConfigs, setNodeConfigs] = useState<Record<string, NodeConfig>>({});
    const navigate = useNavigate();

    useEffect(() => {
        getActions().then(res => {
            setActions(res.data.results || res.data);
        });
    }, []);

    const validateEdge = useCallback((edge: Edge | Connection, currentNodes: Node[], _currentEdges: Edge[], currentConfigs: any) => {
        const sourceNode = currentNodes.find(n => n.id === edge.source);
        const targetNode = currentNodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return { valid: true };

        const sourceConfig = currentConfigs[sourceNode.id] || { input_adapter: {}, output_adapter: {}, input_def: {}, output_def: {} };
        const targetConfig = currentConfigs[targetNode.id] || { input_adapter: {}, output_adapter: {}, input_def: {}, output_def: {} };

        // 1. Determine Source Effective Outputs (Based on Node Interface)
        let availableOutputs: string[] = [];
        if (sourceConfig.output_def && Object.keys(sourceConfig.output_def).length > 0) {
            availableOutputs = Object.keys(sourceConfig.output_def);
        } else {
            // Fallback if no interface defined (should not happen in new flow, but for safety)
            const sourceAction = actions.find(a => a.name === sourceNode.data.action);
            if (sourceAction && sourceAction.output_def) {
                availableOutputs = Object.keys(sourceAction.output_def);
            }
        }

        // 2. Check Target Input Requirements (Based on Node Interface)
        if (targetConfig.input_def) {
            const requiredInputs = Object.entries(targetConfig.input_def)
                .filter(([_, def]: [string, any]) => def.required !== false)
                .map(([key]) => key);

            // In the new flow, the connection itself implies passing data.
            // But we don't have an "Edge Adapter".
            // The "Input Adapter" maps Node Inputs to Action Inputs.
            // BUT, how does the Node get its inputs? From the Edge!
            // So we need to check if the Source Node provides the inputs required by the Target Node.
            // Currently Seaflow merges all parent outputs into one context.
            // So we just check if the required input keys exist in the available outputs.

            for (const reqInput of requiredInputs) {
                if (!availableOutputs.includes(reqInput)) {
                    return { valid: false, reason: `Target requires input '${reqInput}', but Source only provides: ${availableOutputs.join(', ')}` };
                }
            }
        }

        return { valid: true };
    }, [actions]);

    // Re-validate all edges when configs or nodes change
    useEffect(() => {
        setEdges(eds => eds.map(edge => {
            const result = validateEdge(edge, nodes, edges, nodeConfigs);
            return {
                ...edge,
                style: { ...edge.style, stroke: result.valid ? '#94a3b8' : '#ef4444', strokeWidth: result.valid ? 1.5 : 2 },
                animated: !result.valid,
            };
        }));
    }, [nodes, nodeConfigs, validateEdge, setEdges]);

    const onConnect = useCallback((params: Connection) => {
        // Pre-validation on connect
        const result = validateEdge(params, nodes, edges, nodeConfigs);
        if (!result.valid) {
            alert(`Cannot connect: ${result.reason}`);
            return;
        }
        setEdges((eds) => addEdge(params, eds));
    }, [setEdges, validateEdge, nodes, edges, nodeConfigs]);

    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
    }, []);

    const addNode = () => {
        if (!selectedAction) return;
        const action = actions.find(a => a.name === selectedAction);
        const newNode: Node = {
            id: `node-${nodes.length + 1}`,
            data: { label: `${action.title} (${action.name})`, action: action.name },
            position: { x: Math.random() * 400, y: Math.random() * 400 },
            style: {
                border: '1px solid #e2e8f0',
                padding: 10,
                borderRadius: 12,
                background: '#fff',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                color: '#334155',
                fontWeight: 500
            },
        };
        setNodes((nds) => nds.concat(newNode));
        // Initialize config with defaults from Action
        // We can pre-populate input_def based on action.input_def for convenience, 
        // but user requested "User defines Node Inputs first".
        // Let's start empty to force explicit definition, or maybe copy?
        // Copying seems friendlier.
        setNodeConfigs(prev => ({
            ...prev,
            [newNode.id]: {
                input_adapter: {},
                output_adapter: {},
                input_def: action.input_def ? JSON.parse(JSON.stringify(action.input_def)) : {},
                output_def: action.output_def ? JSON.parse(JSON.stringify(action.output_def)) : {}
            }
        }));
    };

    const handleConfigChange = (type: keyof NodeConfig, key: string, value: any) => {
        if (!selectedNodeId) return;
        const nodeId = selectedNodeId;
        setNodeConfigs(prev => {
            const nodeConfig = prev[nodeId];
            if (!nodeConfig) return prev;

            // Handle nested updates for adapters and definitions
            if (type === 'input_adapter' || type === 'output_adapter' || type === 'input_def' || type === 'output_def') {
                return {
                    ...prev,
                    [nodeId]: {
                        ...nodeConfig,
                        [type]: {
                            ...nodeConfig[type],
                            [key]: value
                        }
                    }
                };
            }
            return prev;
        });
    };

    const handleSave = async () => {
        if (!dagName) {
            alert('Please enter DAG name');
            return;
        }

        // Check for invalid edges
        const invalidEdges = edges.filter(e => e.style?.stroke === '#ef4444');
        if (invalidEdges.length > 0) {
            alert('Cannot save: There are invalid connections (red edges). Please fix parameter mappings.');
            return;
        }

        const dsl = {
            identifier: `dag-${dagName}`,
            name: dagName,
            title: dagTitle || dagName,
            components: nodes.map(node => {
                const previousNodes = edges
                    .filter(edge => edge.target === node.id)
                    .map(edge => edge.source);

                const config = nodeConfigs[node.id] || { input_adapter: {}, output_adapter: {}, input_def: {}, output_def: {} };

                return {
                    identifier: node.id,
                    kind: 'Node',
                    name: `${dagName}_${node.id}`,
                    title: node.data.label,
                    action: node.data.action,
                    previous_nodes: previousNodes,
                    input_adapter: config.input_adapter,
                    output_adapter: config.output_adapter,
                    input_def: config.input_def,
                    output_def: config.output_def
                };
            })
        };

        try {
            await createDag(dsl);
            alert('DAG created successfully!');
            navigate('/dags');
        } catch (error) {
            console.error('Failed to create DAG:', error);
            alert('Failed to create DAG');
        }
    };

    const selectedNode = nodes.find(n => n.id === selectedNodeId);
    const selectedNodeAction = selectedNode ? actions.find(a => a.name === selectedNode.data.action) : null;
    const currentConfig = selectedNodeId ? nodeConfigs[selectedNodeId] : null;

    return (
        <div className="flex h-screen p-4 gap-4">
            <div className="w-1/4 space-y-4 overflow-y-auto pb-20">
                <Card className="glass-card border-white/60 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-slate-700">DAG Metadata</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Name</label>
                            <input
                                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white/50 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all mt-2"
                                value={dagName}
                                onChange={e => setDagName(e.target.value)}
                                placeholder="my_dag"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Title</label>
                            <input
                                className="flex h-10 w-full rounded-lg border border-slate-200 bg-white/50 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all mt-2"
                                value={dagTitle}
                                onChange={e => setDagTitle(e.target.value)}
                                placeholder="My DAG"
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="glass-card border-white/60 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-slate-700">Add Node</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Action</label>
                            <select
                                className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white/50 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all mt-2"
                                onChange={e => setSelectedAction(e.target.value)}
                                value={selectedAction}
                            >
                                <option value="" disabled>Select Action</option>
                                {actions.map(action => (
                                    <option key={action.id} value={action.name}>
                                        {action.title} ({action.name})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Button onClick={addNode} disabled={!selectedAction} className="w-full bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-200">Add Node</Button>
                    </CardContent>
                </Card>

                {selectedNode && selectedNodeAction && currentConfig && (
                    <Card className="glass-card border-white/60 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-slate-700 text-lg">Node Config: {selectedNode.data.label}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Tab Navigation */}
                            <div className="flex border-b border-slate-200">
                                <button
                                    className={`px-4 py-2 text-sm font-medium transition-colors ${!currentConfig._tab || currentConfig._tab === 'interface' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    onClick={() => setNodeConfigs(prev => ({ ...prev, [selectedNode.id]: { ...prev[selectedNode.id], _tab: 'interface' } }))}
                                >
                                    Interface
                                </button>
                                <button
                                    className={`px-4 py-2 text-sm font-medium transition-colors ${currentConfig._tab === 'implementation' ? 'border-b-2 border-sky-500 text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    onClick={() => setNodeConfigs(prev => ({ ...prev, [selectedNode.id]: { ...prev[selectedNode.id], _tab: 'implementation' } }))}
                                >
                                    Adapters
                                </button>
                            </div>

                            {(!currentConfig._tab || currentConfig._tab === 'interface') && (
                                <div className="space-y-6 pt-4">
                                    {/* Node Inputs Definition */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-sm text-slate-700">Node Inputs (Define Interface)</h4>
                                        <div className="space-y-2">
                                            {Object.entries(currentConfig.input_def || {}).map(([key, def]: [string, any]) => (
                                                <div key={key} className="flex gap-2 items-center">
                                                    <input
                                                        className="flex h-8 w-1/3 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                                                        value={key}
                                                        readOnly
                                                    />
                                                    <select
                                                        className="flex h-8 w-1/3 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                                                        value={def.type || 'String'}
                                                        onChange={e => handleConfigChange('input_def', key, { ...def, type: e.target.value })}
                                                    >
                                                        <option value="String">String</option>
                                                        <option value="Number">Number</option>
                                                        <option value="Boolean">Boolean</option>
                                                        <option value="Object">Object</option>
                                                        <option value="Array">Array</option>
                                                    </select>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                                        onClick={() => {
                                                            const newDef = { ...currentConfig.input_def };
                                                            delete newDef[key];
                                                            setNodeConfigs(prev => ({
                                                                ...prev,
                                                                [selectedNode.id]: { ...prev[selectedNode.id], input_def: newDef }
                                                            }));
                                                        }}
                                                    >
                                                        ×
                                                    </Button>
                                                </div>
                                            ))}
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    className="flex h-8 w-1/3 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs placeholder:text-slate-400"
                                                    placeholder="New Input"
                                                    id="new-input-def-key"
                                                />
                                                <select
                                                    className="flex h-8 w-1/3 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                                                    id="new-input-def-type"
                                                >
                                                    <option value="String">String</option>
                                                    <option value="Number">Number</option>
                                                    <option value="Boolean">Boolean</option>
                                                    <option value="Object">Object</option>
                                                    <option value="Array">Array</option>
                                                </select>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 w-8 p-0 border-slate-200 text-slate-500 hover:bg-slate-50"
                                                    onClick={() => {
                                                        const keyInput = document.getElementById('new-input-def-key') as HTMLInputElement;
                                                        const typeInput = document.getElementById('new-input-def-type') as HTMLSelectElement;
                                                        if (keyInput.value) {
                                                            handleConfigChange('input_def', keyInput.value, { type: typeInput.value, required: true });
                                                            keyInput.value = '';
                                                        }
                                                    }}
                                                >
                                                    +
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Node Outputs Definition */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-sm text-slate-700">Node Outputs (Define Interface)</h4>
                                        <div className="space-y-2">
                                            {Object.entries(currentConfig.output_def || {}).map(([key, def]: [string, any]) => (
                                                <div key={key} className="flex gap-2 items-center">
                                                    <input
                                                        className="flex h-8 w-1/3 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                                                        value={key}
                                                        readOnly
                                                    />
                                                    <select
                                                        className="flex h-8 w-1/3 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                                                        value={def.type || 'String'}
                                                        onChange={e => handleConfigChange('output_def', key, { ...def, type: e.target.value })}
                                                    >
                                                        <option value="String">String</option>
                                                        <option value="Number">Number</option>
                                                        <option value="Boolean">Boolean</option>
                                                        <option value="Object">Object</option>
                                                        <option value="Array">Array</option>
                                                    </select>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                                        onClick={() => {
                                                            const newDef = { ...currentConfig.output_def };
                                                            delete newDef[key];
                                                            setNodeConfigs(prev => ({
                                                                ...prev,
                                                                [selectedNode.id]: { ...prev[selectedNode.id], output_def: newDef }
                                                            }));
                                                        }}
                                                    >
                                                        ×
                                                    </Button>
                                                </div>
                                            ))}
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    className="flex h-8 w-1/3 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs placeholder:text-slate-400"
                                                    placeholder="New Output"
                                                    id="new-output-def-key"
                                                />
                                                <select
                                                    className="flex h-8 w-1/3 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                                                    id="new-output-def-type"
                                                >
                                                    <option value="String">String</option>
                                                    <option value="Number">Number</option>
                                                    <option value="Boolean">Boolean</option>
                                                    <option value="Object">Object</option>
                                                    <option value="Array">Array</option>
                                                </select>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 w-8 p-0 border-slate-200 text-slate-500 hover:bg-slate-50"
                                                    onClick={() => {
                                                        const keyInput = document.getElementById('new-output-def-key') as HTMLInputElement;
                                                        const typeInput = document.getElementById('new-output-def-type') as HTMLSelectElement;
                                                        if (keyInput.value) {
                                                            handleConfigChange('output_def', keyInput.value, { type: typeInput.value });
                                                            keyInput.value = '';
                                                        }
                                                    }}
                                                >
                                                    +
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentConfig._tab === 'implementation' && (
                                <div className="space-y-6 pt-4">
                                    {/* Input Adapter (Node Inputs -> Action Inputs) */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-sm text-slate-700">Input Adapter</h4>
                                        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center px-2 py-1 bg-slate-100/50 rounded-md mb-2 border border-slate-100">
                                            <span className="text-xs font-bold text-slate-500 text-center uppercase">Node Input</span>
                                            <span className="text-xs text-slate-300">→</span>
                                            <span className="text-xs font-bold text-slate-500 text-center uppercase">Action Input</span>
                                        </div>
                                        {selectedNodeAction.input_def && Object.entries(selectedNodeAction.input_def).map(([paramName, paramDef]: [string, any]) => {
                                            const currentValue = currentConfig.input_adapter[paramName] || '';
                                            const isStandard = Object.keys(currentConfig.input_def || {}).some(k => `$.${k}` === currentValue);
                                            const selectValue = currentValue === '' ? '' : (isStandard ? currentValue : 'custom');

                                            return (
                                                <div key={paramName} className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                                                    {/* Left: Source (Node Input Selector) */}
                                                    <div className="flex flex-col gap-1">
                                                        <select
                                                            className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                                                            value={selectValue}
                                                            onChange={e => handleConfigChange('input_adapter', paramName, e.target.value)}
                                                        >
                                                            <option value="">Select Node Input</option>
                                                            {Object.keys(currentConfig.input_def || {}).map(inputKey => (
                                                                <option key={inputKey} value={`$.${inputKey}`}>
                                                                    {inputKey}
                                                                </option>
                                                            ))}
                                                            <option value="custom">Custom JSONPath...</option>
                                                        </select>
                                                        {selectValue === 'custom' && (
                                                            <input
                                                                className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                                                                placeholder="Custom JSONPath"
                                                                value={currentValue === 'custom' ? '' : currentValue}
                                                                onChange={e => handleConfigChange('input_adapter', paramName, e.target.value)}
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Center: Arrow */}
                                                    <span className="text-slate-300 text-center">→</span>

                                                    {/* Right: Target (Action Input Label) */}
                                                    <div className="flex items-center h-8 px-2 bg-slate-50 rounded-md border border-slate-200">
                                                        <span className="text-xs font-medium text-slate-600">
                                                            {paramName}
                                                            {paramDef.required && <span className="ml-1 text-rose-500">*</span>}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Output Adapter (Action Outputs -> Node Outputs) */}
                                    <div className="space-y-3">
                                        <h4 className="font-bold text-sm text-slate-700">Output Adapter</h4>
                                        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center px-2 py-1 bg-slate-100/50 rounded-md mb-2 border border-slate-100">
                                            <span className="text-xs font-bold text-slate-500 text-center uppercase">Action Output</span>
                                            <span className="text-xs text-slate-300">→</span>
                                            <span className="text-xs font-bold text-slate-500 text-center uppercase">Node Output</span>
                                        </div>
                                        {Object.keys(currentConfig.output_def || {}).map(nodeOutputKey => {
                                            const currentValue = currentConfig.output_adapter[nodeOutputKey] || '';
                                            const isStandard = selectedNodeAction.output_def && Object.keys(selectedNodeAction.output_def).some(k => `$.${k}` === currentValue);
                                            const selectValue = currentValue === '' ? '' : (isStandard ? currentValue : 'custom');

                                            return (
                                                <div key={nodeOutputKey} className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                                                    {/* Left: Source (Action Output Selector) */}
                                                    <div className="flex flex-col gap-1">
                                                        <select
                                                            className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                                                            value={selectValue}
                                                            onChange={e => handleConfigChange('output_adapter', nodeOutputKey, e.target.value)}
                                                        >
                                                            <option value="">Select Action Output</option>
                                                            {selectedNodeAction.output_def && Object.keys(selectedNodeAction.output_def).map(outKey => (
                                                                <option key={outKey} value={`$.${outKey}`}>
                                                                    {outKey}
                                                                </option>
                                                            ))}
                                                            <option value="custom">Custom JSONPath...</option>
                                                        </select>
                                                        {selectValue === 'custom' && (
                                                            <input
                                                                className="flex h-8 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                                                                placeholder="Custom JSONPath"
                                                                value={currentValue === 'custom' ? '' : currentValue}
                                                                onChange={e => handleConfigChange('output_adapter', nodeOutputKey, e.target.value)}
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Center: Arrow */}
                                                    <span className="text-slate-300 text-center">→</span>

                                                    {/* Right: Target (Node Output Label) */}
                                                    <div className="flex items-center h-8 px-2 bg-slate-50 rounded-md border border-slate-200">
                                                        <span className="text-xs font-medium text-slate-600">{nodeOutputKey}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {Object.keys(currentConfig.output_def || {}).length === 0 && (
                                            <p className="text-xs text-slate-400 text-center py-4 border border-dashed border-slate-200 rounded-md">
                                                No Node Outputs defined. Go to Interface tab to define outputs.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <Button onClick={handleSave} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-200">Save DAG</Button>
            </div>

            <div className="flex-1 glass-card border-white/60 rounded-2xl shadow-xl overflow-hidden relative">
                <ReactFlowProvider>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        fitView
                        className="bg-slate-50"
                    >
                        <Background color="#cbd5e1" gap={20} size={1} />
                        <Controls className="bg-white border-slate-200 fill-slate-500 shadow-sm" />
                    </ReactFlow>
                </ReactFlowProvider>
            </div>
        </div>
    );
};

export default DagCreate;
