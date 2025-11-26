import { useEffect, useState } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { useParams } from 'react-router-dom';
import { getDagDetail } from '../lib/api';
import type { Dag, Component } from '../types';
import CustomDagNode from '../components/CustomDagNode';
import SubDagNode from '../components/SubDagNode';
import CustomEdge from '../components/CustomEdge';

const nodeTypes = {
    custom: CustomDagNode,
    subDag: SubDagNode,
};

const edgeTypes = {
    custom: CustomEdge,
};

const nodeWidth = 172;
const nodeHeight = 36;

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
        subGraph.setGraph({ rankdir: direction });

        children.forEach((child) => {
            subGraph.setNode(child.id, { width: nodeWidth, height: nodeHeight });
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
            // dagre pos is center
            const x = nodeWithPos.x - nodeWidth / 2;
            const y = nodeWithPos.y - nodeHeight / 2;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + nodeWidth);
            maxY = Math.max(maxY, y + nodeHeight);

            // Store absolute pos temporarily, will adjust to relative later
            child.position = { x, y };
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
        dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
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
        const height = Number(node.style?.height) || nodeHeight;

        node.position = {
            x: nodeWithPosition.x - width / 2,
            y: nodeWithPosition.y - height / 2,
        };
    });

    return { nodes, edges };
};

const DagDetail = () => {
    const { dagId } = useParams<{ dagId: string }>();
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNode, setSelectedNode] = useState<Component | null>(null);

    useEffect(() => {
        if (dagId) {
            getDagDetail(dagId).then((res) => {
                const dag: Dag = res.data;
                const initialNodes: Node[] = [];
                const initialEdges: Edge[] = [];

                const processComponents = (components: Component[], parentId?: string) => {
                    components.forEach((comp: Component) => {
                        if (comp.kind === 'Dag') {
                            // Sub-DAG: create as a group node
                            initialNodes.push({
                                id: comp.identifier,
                                data: { label: comp.title || comp.name, component: comp },
                                position: { x: 0, y: 0 },
                                type: 'subDag',
                                parentNode: parentId,
                                extent: parentId ? 'parent' : undefined,
                            });

                            // Recursively process children
                            if (comp.components) {
                                processComponents(comp.components, comp.identifier);
                            }
                        } else {
                            // Regular node
                            initialNodes.push({
                                id: comp.identifier,
                                data: { label: comp.title || comp.name, component: comp },
                                position: { x: 0, y: 0 }, // Calculated later
                                type: 'custom',
                                parentNode: parentId,
                                extent: parentId ? 'parent' : undefined,
                            });
                        }

                        if (comp.previous_nodes) {
                            comp.previous_nodes.forEach((prev) => {
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
                        if (comp.previous_dags) {
                            comp.previous_dags.forEach((prev) => {
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

                processComponents(dag.components);

                const layouted = getLayoutedElements(initialNodes, initialEdges);
                setNodes(layouted.nodes);
                setEdges(layouted.edges);
            });
        }
    }, [dagId, setNodes, setEdges]);

    const onNodeClick = (_: React.MouseEvent, node: Node) => {
        setSelectedNode(node.data.component);
    };

    const onPaneClick = () => {
        setSelectedNode(null);
    };

    return (
        <div className="flex h-[calc(100vh-100px)] gap-4">
            <div className="flex-1 glass-card rounded-2xl shadow-xl border border-white/60 relative overflow-hidden">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
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
            {selectedNode && (
                <div className="w-96 glass-panel rounded-2xl shadow-2xl border border-white/60 p-6 overflow-y-auto animate-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-700">Node Details</h2>
                        <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                            ✕
                        </button>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Name</label>
                            <p className="font-medium text-slate-700">{selectedNode.name}</p>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Title</label>
                            <p className="font-medium text-slate-700">{selectedNode.title}</p>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Identifier</label>
                            <p className="font-medium text-slate-700 font-mono text-xs">{selectedNode.identifier}</p>
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Kind</label>
                            <p className="font-medium text-slate-700">{selectedNode.kind}</p>
                        </div>
                        {selectedNode.action_detail && (
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                                <h3 className="text-sm font-bold text-slate-700 mb-2">Action Details</h3>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500">Action Name</label>
                                    <p className="font-medium text-slate-700">{selectedNode.action}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500">Action Type</label>
                                    <p className="font-medium mt-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${selectedNode.action_detail.type === 'external' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                            selectedNode.action_detail.type === 'carrier' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                                                'bg-sky-50 text-sky-600 border-sky-200'
                                            }`}>
                                            {selectedNode.action_detail.type}
                                        </span>
                                    </p>
                                </div>
                                {selectedNode.action_detail.func && (
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500">Action Func</label>
                                        <p className="text-xs font-mono bg-white border border-slate-200 p-2 rounded-lg break-all text-slate-600 mt-1">{selectedNode.action_detail.func}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs font-semibold text-slate-500">Action Input Def</label>
                                    <pre className="bg-white border border-slate-200 p-2 rounded-lg text-xs overflow-auto max-h-40 mt-1 font-mono text-slate-600">
                                        {JSON.stringify(selectedNode.action_detail.input_def, null, 2)}
                                    </pre>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-500">Action Output Def</label>
                                    <pre className="bg-white border border-slate-200 p-2 rounded-lg text-xs overflow-auto max-h-40 mt-1 font-mono text-slate-600">
                                        {JSON.stringify(selectedNode.action_detail.output_def, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* Node Type Properties */}
                        {(selectedNode.fissionable || selectedNode.iterable || selectedNode.loopable) && (
                            <div className="border border-sky-100 rounded-xl p-4 bg-sky-50/30 space-y-3">
                                <h3 className="text-sm font-bold text-slate-700 mb-2">Node Type Properties</h3>
                                {selectedNode.fissionable && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 font-medium">
                                                Fissionable
                                            </span>
                                        </div>
                                        {selectedNode.fission_config && (
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500">Fission Config</label>
                                                <pre className="bg-white border border-slate-200 p-2 rounded-lg text-xs overflow-auto max-h-40 mt-1 font-mono text-slate-600">
                                                    {JSON.stringify(selectedNode.fission_config, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {selectedNode.iterable && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-200 font-medium">
                                                Iterable
                                            </span>
                                        </div>
                                        {selectedNode.iter_config && (
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500">Iteration Config</label>
                                                <pre className="bg-white border border-slate-200 p-2 rounded-lg text-xs overflow-auto max-h-40 mt-1 font-mono text-slate-600">
                                                    {JSON.stringify(selectedNode.iter_config, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {selectedNode.loopable && (
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                                                Loopable
                                            </span>
                                        </div>
                                        {selectedNode.loop_config && (
                                            <div>
                                                <label className="text-xs font-semibold text-slate-500">Loop Config</label>
                                                <pre className="bg-white border border-slate-200 p-2 rounded-lg text-xs overflow-auto max-h-40 mt-1 font-mono text-slate-600">
                                                    {JSON.stringify(selectedNode.loop_config, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Add more fields as needed, e.g., adapters */}
                        {selectedNode.input_adapter && (
                            <div>
                                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Input Adapter</label>
                                <pre className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs overflow-auto max-h-40 mt-2 font-mono text-slate-600">
                                    {JSON.stringify(selectedNode.input_adapter, null, 2)}
                                </pre>
                            </div>
                        )}
                        {selectedNode.output_adapter && (
                            <div>
                                <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Output Adapter</label>
                                <pre className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs overflow-auto max-h-40 mt-2 font-mono text-slate-600">
                                    {JSON.stringify(selectedNode.output_adapter, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DagDetail;
