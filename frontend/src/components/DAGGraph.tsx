import React, { useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    type Connection,
    type Edge,
    type Node,
    useNodesState,
    useEdgesState,
    addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { type Dag, type Component } from '../types';

const nodeWidth = 172;

interface DAGGraphProps {
    dag: Dag;
    onNodeClick?: (event: React.MouseEvent, node: Node) => void;
}

const DAGGraph: React.FC<DAGGraphProps> = ({ dag, onNodeClick }) => {
    // Transform DAG nodes to ReactFlow nodes
    const initialNodes: Node[] = dag.components
        .filter(c => c.kind === 'Node')
        .map((node) => ({
            id: node.identifier,
            data: { label: node.title || node.name },
            position: { x: 0, y: 0 }, // Initial position, will be laid out
            style: { border: '1px solid #777', padding: 10, borderRadius: 5, background: '#fff', width: nodeWidth },
        }));

    // Transform DAG edges
    const initialEdges: Edge[] = [];
    dag.components.forEach(component => {
        if (component.kind === 'Node') {
            const node = component as Component;
            if (node.previous_nodes) {
                node.previous_nodes.forEach((prevId: string) => {
                    initialEdges.push({
                        id: `e${prevId}-${node.identifier}`,
                        source: prevId,
                        target: node.identifier,
                        animated: true,
                    });
                });
            }
        }
    });



    const [nodes, _setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback(
        (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
        [setEdges]
    );

    return (
        <div style={{ height: 600, border: '1px solid #eee' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                fitView
            >
                <Background />
                <Controls />
            </ReactFlow>
        </div>
    );
};

export default DAGGraph;
