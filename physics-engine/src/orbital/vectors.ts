import { Vector2 } from "../types";

export function magnitude(

    v: Vector2

): number {

    return Math.hypot(

        v.x,

        v.y

    );

}

export function normalize(

    v: Vector2

): Vector2 {

    const mag = magnitude(v);

    if (mag < 1e-8) {

        return {

            x: 0,

            y: 0

        };

    }

    return {

        x: v.x / mag,

        y: v.y / mag

    };

}

export function dot(

    a: Vector2,

    b: Vector2

): number {

    return a.x * b.x + a.y * b.y;
}

export function cross(

    a: Vector2,

    b: Vector2

): number {

    return (

        a.x * b.y - a.y * b.x

    );

}
