import { memo } from 'react';
import { getSmoothStepPath, type EdgeProps, BaseEdge } from 'reactflow';

const CustomEdge = ({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
}: EdgeProps) => {
    // Calculate the center X position for the vertical segment
    // We use a fixed offset (50px) from the target because:
    // 1. It ensures all edges entering the same target share the same vertical line (alignment)
    // 2. Since ranksep is 100px, 50px places it exactly in the middle of the gap
    const centerX = targetX - 50;

    const [edgePath] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        centerX,
    });

    return (
        <>
            {/* Glow Effect */}
            <BaseEdge
                path={edgePath}
                style={{
                    ...style,
                    strokeWidth: (Number(style.strokeWidth) || 1) + 4,
                    stroke: style.stroke ? `${style.stroke}40` : '#38bdf840', // 25% opacity
                    filter: 'blur(4px)'
                }}
            />
            {/* Main Line */}
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
        </>
    );
};

export default memo(CustomEdge);
