import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';

const SubDagNode = ({ data, selected }: NodeProps) => {
    return (
        <div
            className={`relative w-full h-full rounded-xl border-2 border-dashed transition-all duration-300 ${selected
                ? 'border-sky-400 bg-sky-100/50 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                : 'border-slate-300 bg-slate-50/50 hover:border-sky-300/50'
                }`}
        >
            <div className="absolute -top-3 left-4 px-2 bg-white border border-slate-200 rounded text-xs font-bold text-sky-600 shadow-sm">
                {data.label}
            </div>

            {/* Handles for connections */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-3 !h-3 !bg-white !border-2 !border-sky-500"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="!w-3 !h-3 !bg-white !border-2 !border-sky-500"
            />
        </div>
    );
};

export default memo(SubDagNode);
