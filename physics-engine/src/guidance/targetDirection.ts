import { Vector2 } from "../types";

export interface TargetDirection {
    direction: Vector2;
    pitchRad: number;
}

function normalize(v: Vector2): Vector2 {
    const mag = Math.hypot(v.x, v.y);

    if (mag < 1e-8) {
        return {
            x: 0,
            y: 1
        };
    }

    return {
        x: v.x / mag,
        y: v.y / mag
    };
}

export function targetDirection(
    direction: Vector2
): TargetDirection {

    const dir = normalize(direction);

    return {

        direction: dir,

        pitchRad: Math.atan2(
            dir.y,
            dir.x
        )

    };

}