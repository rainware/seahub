import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
    MarkerType,
    Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { getTaskDetail } from '../lib/api';
import { type Task, type TaskComponent } from '../types';
import SubDagNode from '../components/SubDagNode';
import CustomEdge from '../components/CustomEdge';
import { Activity, Box, Layers, Terminal } from 'lucide-react';

const nodeTypes = {
    subDag: SubDagNode,
};

const edgeTypes = {
    custom: CustomEdge,
};

const nodeWidth = 180;
const nodeHeight = 36;

// Estimate height based on text length
// Assuming ~18 chars per line, 20px line height, 46px base padding/height
const estimateHeight = (label: string) => {
    if (!label) return nodeHeight;
    const charsPerLine = 18;
    const lineHeight = 20;
    const baseHeight = 46;
    const lines = Math.ceil(label.length / charsPerLine);
    return Math.max(nodeHeight, baseHeight + (lines - 1) * lineHeight);
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
    // 1. Separate nodes
    const groupNodes = nodes.filter((n) => n.type === 'subDag');
    const regularNodes = nodes.filter((n) => !n.parentNode && n.type !== 'subDag');
    const childNodes = nodes.filter((n) => n.parentNode);

    // 2. Process each group to determine size and internal layout
    groupNodes.forEach((group) => {
        const children = childNodes.filter((n) => n.parentNode === group.id);
        const childIds = children.map((n) => n.id);
        const internalEdges = edges.filter((e) => childIds.includes(e.source) && childIds.includes(e.target));

        if (children.length === 0) {
            // Empty group default size
            group.style = { width: nodeWidth + 40, height: nodeHeight + 40 };
            return;
        }

        // Layout children to find group size
        const subGraph = new dagre.graphlib.Graph();
        subGraph.setDefaultEdgeLabel(() => ({}));
        subGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

        children.forEach((child) => {
            const height = estimateHeight(child.data.label);
            subGraph.setNode(child.id, { width: nodeWidth, height: height });
        });
        internalEdges.forEach((edge) => {
            subGraph.setEdge(edge.source, edge.target);
        });

        dagre.layout(subGraph);

        // Calculate bounding box
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;

        children.forEach((child) => {
            const nodeWithPos = subGraph.node(child.id);
            const height = estimateHeight(child.data.label);

            // dagre pos is center
            const x = nodeWithPos.x - nodeWidth / 2;
            const y = nodeWithPos.y - height / 2;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + nodeWidth);
            maxY = Math.max(maxY, y + height);

            // Store absolute pos temporarily, will adjust to relative later
            child.position = { x, y };
            child.targetPosition = direction === 'LR' ? Position.Left : Position.Top;
            child.sourcePosition = direction === 'LR' ? Position.Right : Position.Bottom;
        });

        const padding = 40; // Padding inside the group
        const width = maxX - minX + padding * 2;
        const height = maxY - minY + padding * 2;

        // Update group node size
        group.style = { width, height };

        // Adjust children positions to be relative to group
        children.forEach((child) => {
            child.position.x = child.position.x - minX + padding;
            child.position.y = child.position.y - minY + padding;
        });
    });

    // 3. Main Layout
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

    // Add regular nodes
    regularNodes.forEach((node) => {
        const height = estimateHeight(node.data.label);
        dagreGraph.setNode(node.id, { width: nodeWidth, height: height });
    });

    // Add group nodes with calculated sizes
    groupNodes.forEach((group) => {
        dagreGraph.setNode(group.id, {
            width: Number(group.style?.width) || nodeWidth,
            height: Number(group.style?.height) || nodeHeight
        });
    });

    // Add edges (mapping children to parents)
    edges.forEach((edge) => {
        let source = edge.source;
        let target = edge.target;

        const sourceNode = nodes.find((n) => n.id === source);
        const targetNode = nodes.find((n) => n.id === target);

        // If source/target is child, map to parent group
        if (sourceNode?.parentNode) source = sourceNode.parentNode;
        if (targetNode?.parentNode) target = targetNode.parentNode;

        // Only add edge if it connects different top-level elements
        // (Internal edges are already handled in sub-layout)
        if (source !== target) {
            dagreGraph.setEdge(source, target);
        }
    });

    dagre.layout(dagreGraph);

    // 4. Apply positions to top-level nodes
    [...regularNodes, ...groupNodes].forEach((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        const width = Number(node.style?.width) || nodeWidth;
        // For regular nodes, use estimated height. For groups, use calculated style height.
        const height = node.type === 'subDag'
            ? (Number(node.style?.height) || nodeHeight)
            : estimateHeight(node.data.label);

        node.targetPosition = direction === 'LR' ? Position.Left : Position.Top;
        node.sourcePosition = direction === 'LR' ? Position.Right : Position.Bottom;

        node.position = {
            x: nodeWithPosition.x - width / 2,
            y: nodeWithPosition.y - height / 2,
        };
    });

    return { nodes, edges };
};

const TaskDetail: React.FC = () => {
    const { taskId } = useParams<{ taskId: string }>();
    const [task, setTask] = useState<Task | null>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedStep, setSelectedStep] = useState<any | null>(null);
    const [stepMap, setStepMap] = useState<Map<string, any>>(new Map());

    useEffect(() => {
        if (taskId) {
            getTaskDetail(taskId)
                .then(response => {
                    const taskData: Task = response.data;
                    setTask(taskData);

                    // Build Graph
                    const initialNodes: Node[] = [];
                    const initialEdges: Edge[] = [];
                    const newStepMap = new Map<string, any>();

                    // Helper to process components recursively
                    const processComponents = (components: TaskComponent[], parentId?: string) => {
                        components.forEach((comp) => {
                            if (comp.kind === 'Task') {
                                // Sub-Task: create as a group node (using SubDagNode for visual consistency)
                                initialNodes.push({
                                    id: comp.identifier,
                                    data: { label: comp.title || comp.name, component: comp },
                                    position: { x: 0, y: 0 },
                                    type: 'subDag',
                                    parentNode: parentId,
                                    extent: parentId ? 'parent' : undefined,
                                    style: {
                                        backgroundColor: 'rgba(240, 249, 255, 0.5)', // Sky 50/50
                                        border: '1px dashed rgba(14, 165, 233, 0.3)',
                                        borderRadius: '12px',
                                    }
                                });

                                // Recursively process children
                                if (comp.components) {
                                    processComponents(comp.components, comp.identifier);
                                }
                            } else {
                                // Step
                                newStepMap.set(comp.identifier, comp);

                                let bg = 'rgba(255, 255, 255, 0.9)';
                                let border = 'rgba(203, 213, 225, 0.8)'; // Slate 300
                                let color = '#334155'; // Slate 700

                                if (comp.state === 'SUCCESS') {
                                    bg = 'rgba(209, 250, 229, 0.9)'; // Emerald 100
                                    border = 'rgba(52, 211, 153, 0.5)'; // Emerald 400
                                    color = '#065f46'; // Emerald 800
                                } else if (comp.state === 'PROCESSING') {
                                    bg = 'rgba(224, 242, 254, 0.9)'; // Sky 100
                                    border = 'rgba(56, 189, 248, 0.5)'; // Sky 400
                                    color = '#075985'; // Sky 800
                                } else if (comp.state === 'ERROR') {
                                    bg = 'rgba(255, 228, 230, 0.9)'; // Rose 100
                                    border = 'rgba(251, 113, 133, 0.5)'; // Rose 400
                                    color = '#9f1239'; // Rose 800
                                }

                                initialNodes.push({
                                    id: comp.identifier,
                                    position: { x: 0, y: 0 }, // Layout will handle this
                                    parentNode: parentId,
                                    extent: parentId ? 'parent' : undefined,
                                    data: { label: `${comp.title} (${comp.state})` },
                                    style: {
                                        background: bg,
                                        border: `1px solid ${border}`,
                                        borderRadius: '12px',
                                        padding: '10px',
                                        width: 180,
                                        color: color,
                                        fontSize: '12px',
                                        backdropFilter: 'blur(4px)',
                                        boxShadow: comp.state === 'PROCESSING' ? '0 0 15px rgba(14, 165, 233, 0.3)' : '0 2px 4px rgba(0,0,0,0.05)',
                                    },
                                });
                            }

                            // Create Edges
                            if (comp.previous_steps) {
                                comp.previous_steps.forEach((prev) => {
                                    initialEdges.push({
                                        id: `${prev}-${comp.identifier}`,
                                        source: prev,
                                        target: comp.identifier,
                                        type: 'custom',
                                        animated: true,
                                        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
                                        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
                                    });
                                });
                            }
                            if (comp.previous_tasks) {
                                comp.previous_tasks.forEach((prev) => {
                                    initialEdges.push({
                                        id: `${prev}-${comp.identifier}`,
                                        source: prev,
                                        target: comp.identifier,
                                        type: 'custom',
                                        animated: true,
                                        style: { stroke: '#38bdf8', strokeWidth: 2 },
                                        markerEnd: { type: MarkerType.ArrowClosed, color: '#38bdf8' },
                                    });
                                });
                            }
                        });
                    };

                    if (taskData.components) {
                        processComponents(taskData.components);
                    } else if (taskData.steps) {
                        // Fallback for flat steps
                        taskData.steps.forEach((step) => {
                            const stepId = `step-${step.id}`;
                            newStepMap.set(stepId, step);
                            initialNodes.push({
                                id: stepId,
                                position: { x: 0, y: 0 },
                                data: { label: `${step.title} (${step.state})` },
                                style: {
                                    background: step.state === 'SUCCESS' ? '#dcfce7' :
                                        step.state === 'PROCESSING' ? '#dbeafe' :
                                            step.state === 'ERROR' ? '#fee2e2' : '#f8fafc',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '12px',
                                    padding: '10px',
                                    width: 150,
                                    color: '#334155',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                },
                            });
                            if (step.previous_steps) {
                                step.previous_steps.forEach((prevStepId: any) => {
                                    const prevId = `step-${prevStepId}`;
                                    initialEdges.push({
                                        id: `${prevId}-${stepId}`,
                                        source: prevId,
                                        target: stepId,
                                        type: 'custom',
                                        animated: true,
                                        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
                                        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
                                    });
                                });
                            }
                        });
                    }

                    // Apply Dagre layout
                    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                        initialNodes,
                        initialEdges
                    );

                    setNodes(layoutedNodes);
                    setEdges(layoutedEdges);
                    setStepMap(newStepMap);
                })
                .catch(error => {
                    console.error("Error fetching Task detail:", error);
                });
        }
    }, [taskId, setNodes, setEdges, setStepMap]);

    const onNodeClick = (_event: React.MouseEvent, node: Node) => {
        const step = stepMap.get(node.id);
        setSelectedStep(step || null);
    };

    if (!task) return <div className="p-8 text-slate-500">Loading task details...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-600 to-cyan-500 bg-clip-text text-transparent drop-shadow-sm">
                        {task.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-1 text-slate-500">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">ID: {task.id}</span>
                        <span>•</span>
                        <span>{task.name}</span>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium border shadow-sm ${task.state === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                    task.state === 'PROCESSING' ? 'bg-sky-100 text-sky-700 border-sky-200 animate-pulse' :
                        task.state === 'ERROR' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                    {task.state_display}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-sky-600 font-bold mb-2">
                        <Box className="w-5 h-5" />
                        <h3>Basic Info</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-slate-500 block mb-1">DAG</span>
                            <span className="text-slate-700 font-medium">{task.dag?.name}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block mb-1">Status</span>
                            <span className="text-slate-700 font-medium">{task.state}</span>
                        </div>
                    </div>
                </div>

                <div className="glass-card rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-sky-600 font-bold mb-2">
                        <Activity className="w-5 h-5" />
                        <h3>Execution Metrics</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <span className="text-slate-500 block mb-1">Start Time</span>
                            <span className="text-slate-700 font-mono text-xs">{new Date(task.start_time).toLocaleTimeString()}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block mb-1">End Time</span>
                            <span className="text-slate-700 font-mono text-xs">{task.end_time ? new Date(task.end_time).toLocaleTimeString() : '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block mb-1">Duration</span>
                            <span className="text-slate-700 font-mono text-xs">{task.duration}s</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-2xl overflow-hidden h-[600px] border border-white/60 shadow-xl relative">
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 text-slate-500 bg-white/80 backdrop-blur px-3 py-1 rounded-full border border-slate-200 text-xs shadow-sm">
                    <Layers className="w-4 h-4" />
                    <span>Flowchart Visualization</span>
                </div>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    nodesDraggable={true}
                    nodesConnectable={false}
                    deleteKeyCode={null}
                    fitView
                    className="bg-slate-50"
                >
                    <Background color="#cbd5e1" gap={20} size={1} />
                    <Controls className="bg-white border-slate-200 fill-slate-500 shadow-sm" />
                    <MiniMap
                        nodeColor={(n) => {
                            if (n.style?.background) return n.style.background as string;
                            return '#e2e8f0';
                        }}
                        maskColor="rgba(241, 245, 249, 0.7)"
                        className="bg-white border-slate-200"
                    />
                </ReactFlow>
            </div>

            {selectedStep && (
                <div className="glass-card rounded-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${selectedStep.state === 'SUCCESS' ? 'bg-emerald-100 text-emerald-600' :
                                selectedStep.state === 'ERROR' ? 'bg-rose-100 text-rose-600' :
                                    'bg-sky-100 text-sky-600'
                                }`}>
                                <Terminal className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-700">{selectedStep.name}</h3>
                                <span className="text-xs text-slate-500 font-mono">Step Details</span>
                            </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${selectedStep.state === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                            selectedStep.state === 'ERROR' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                                'bg-sky-50 text-sky-600 border border-sky-200'
                            }`}>
                            {selectedStep.state_display}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-slate-500">Input Data</h4>
                            <pre className="bg-slate-50 border border-slate-200 p-4 rounded-xl overflow-auto max-h-60 text-xs font-mono text-slate-600">
                                {JSON.stringify(selectedStep.input, null, 2)}
                            </pre>
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-sm font-bold text-slate-500">Output Result</h4>
                            <pre className="bg-slate-50 border border-slate-200 p-4 rounded-xl overflow-auto max-h-60 text-xs font-mono text-slate-600">
                                {JSON.stringify(selectedStep.output, null, 2)}
                            </pre>
                        </div>
                    </div>

                    <div className="mt-6 space-y-2">
                        <h4 className="text-sm font-bold text-slate-500">Execution Logs</h4>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl overflow-auto max-h-60 font-mono text-xs text-slate-300">
                            {selectedStep.logs && selectedStep.logs.length > 0 ? (
                                selectedStep.logs.map((log: any, index: number) => (
                                    <div key={index} className="border-b border-slate-800 last:border-0 py-1">
                                        <span className="text-slate-500 mr-2">[{index + 1}]</span>
                                        {typeof log === 'string' ? log : JSON.stringify(log)}
                                    </div>
                                ))
                            ) : (
                                <span className="text-slate-500 italic">No logs available for this step.</span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskDetail;
