import { GuidanceState } from "./types";
import { Vector2 } from "../types";

export function velocityTurn(
    state: GuidanceState
): Vector2 {

    const vx = state.velocity.x;

    const vy = state.velocity.y;

    const speed = Math.hypot(vx, vy);

    if (speed < 1e-6) {

        return {

            x: 0,

            y: 1

        };

    }

    return {

        x: vx / speed,

        y: vy / speed

    };

}