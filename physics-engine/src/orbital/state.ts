import { computeOrbitState } from "./orbit";
import { computeOrbitalElements } from "./elements";

export interface OrbitalState {

    orbit: ReturnType<typeof computeOrbitState>;

    elements: ReturnType<typeof computeOrbitalElements>;

}

export function computeOrbitalState(

    altitude: number,

    velocity: number

): OrbitalState {

    return {

        orbit:
            computeOrbitState(
                altitude,
                velocity
            ),

        elements:
            computeOrbitalElements(
                altitude,
                velocity
            )

    };

}
