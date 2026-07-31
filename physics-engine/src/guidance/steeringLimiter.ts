import { Vector2 } from "../types";

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

export function steeringLimiter(

    previous: Vector2,

    desired: Vector2,

    maxTurnRateDeg: number,

    dt: number

): Vector2 {

    const prevAngle =
        Math.atan2(previous.y, previous.x);

    const desiredAngle =
        Math.atan2(desired.y, desired.x);

    let delta =
        desiredAngle - prevAngle;

    while (delta > Math.PI)
        delta -= 2 * Math.PI;

    while (delta < -Math.PI)
        delta += 2 * Math.PI;

    const maxDelta =
        maxTurnRateDeg *
        Math.PI / 180 *
        dt;

    const limited =
        Math.max(
            -maxDelta,
            Math.min(maxDelta, delta)
        );

    return normalize({

        x: Math.cos(prevAngle + limited),

        y: Math.sin(prevAngle + limited)

    });

}