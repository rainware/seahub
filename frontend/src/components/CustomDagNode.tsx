import React from 'react';
import { Handle, Position } from 'reactflow';
import type { Component } from '../types';

interface CustomNodeProps {
    data: {
        label: string;
        component: Component;
    };
}

const CustomDagNode: React.FC<CustomNodeProps> = ({ data }) => {
    const { component } = data;
    const { fissionable, iterable, loopable } = component;

    // Determine node classes based on properties
    const isStacked = fissionable || iterable;
    const isDiagonal = fissionable && iterable;

    return (
        <div className="relative">
            {/* Stacking effect */}
            {isStacked && (
                <>
                    {/* Third layer (most offset) */}
                    <div
                        className="absolute bg-white border-2 border-gray-400 rounded"
                        style={{
                            width: 172,
                            height: 36,
                            top: isDiagonal ? 8 : (fissionable ? 8 : 0),
                            left: isDiagonal ? 8 : (iterable ? 8 : 0),
                            zIndex: 1,
                        }}
                    />
                    {/* Second layer */}
                    <div
                        className="absolute bg-white border-2 border-gray-400 rounded"
                        style={{
                            width: 172,
                            height: 36,
                            top: isDiagonal ? 4 : (fissionable ? 4 : 0),
                            left: isDiagonal ? 4 : (iterable ? 4 : 0),
                            zIndex: 2,
                        }}
                    />
                </>
            )}

            {/* Main node */}
            <div
                className={`relative bg-white border-2 rounded px-3 py-2 text-sm ${loopable ? 'loopable-node' : 'border-gray-600'
                    }`}
                style={{
                    width: 172,
                    height: 36,
                    zIndex: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Handle type="target" position={Position.Left} />
                <div className="truncate text-center">{data.label}</div>
                <Handle type="source" position={Position.Right} />
            </div>

            {/* Loopable animation styles */}
            {loopable && (
                <style>{`
                    .loopable-node {
                        border-color: #777;
                        position: relative;
                        overflow: visible;
                    }
                    .loopable-node::before,
                    .loopable-node::after {
                        content: '';
                        position: absolute;
                        width: 8px;
                        height: 8px;
                        background: radial-gradient(circle, #777 0%, rgba(119, 119, 119, 0) 70%);
                        border-radius: 50%;
                        box-shadow: 0 0 10px #777;
                    }
                    .loopable-node::before {
                        animation: circulate1 3s linear infinite;
                    }
                    .loopable-node::after {
                        animation: circulate2 3s linear infinite;
                    }
                    @keyframes circulate1 {
                        0% { top: -4px; left: -4px; }
                        25% { top: -4px; left: calc(100% - 4px); }
                        50% { top: calc(100% - 4px); left: calc(100% - 4px); }
                        75% { top: calc(100% - 4px); left: -4px; }
                        100% { top: -4px; left: -4px; }
                    }
                    @keyframes circulate2 {
                        0% { top: calc(100% - 4px); left: calc(100% - 4px); }
                        25% { top: calc(100% - 4px); left: -4px; }
                        50% { top: -4px; left: -4px; }
                        75% { top: -4px; left: calc(100% - 4px); }
                        100% { top: calc(100% - 4px); left: calc(100% - 4px); }
                    }
                `}</style>
            )}
        </div>
    );
};

export default CustomDagNode;
