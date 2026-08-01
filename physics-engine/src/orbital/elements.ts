import { EARTH_MU, EARTH_RADIUS } from "./constants";

export interface OrbitalElements {

    semiMajorAxis: number;

    eccentricity: number;

    specificEnergy: number;

    angularMomentum: number;

    apoapsis: number;

    periapsis: number;

}

export function computeOrbitalElements(

    altitude: number,

    velocity: number

): OrbitalElements {

    const r =
        EARTH_RADIUS + altitude;

    const specificEnergy =
        velocity * velocity / 2 -
        EARTH_MU / r;

    const semiMajorAxis =
        -EARTH_MU /
        (2 * specificEnergy);

    /*
        Circular orbit approximation.

        We'll replace this later with
        the full vector solution.
    */

    const eccentricity = 0;

    const angularMomentum =
        r * velocity;

    const apoapsis =
        semiMajorAxis *
        (1 + eccentricity);

    const periapsis =
        semiMajorAxis *
        (1 - eccentricity);

    return {

        semiMajorAxis,

        eccentricity,

        specificEnergy,

        angularMomentum,

        apoapsis,

        periapsis

    };

}