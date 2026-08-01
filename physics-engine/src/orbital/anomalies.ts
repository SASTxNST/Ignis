export function trueAnomaly(

    eccentricity: number,

    radius: number,

    semiMajorAxis: number

): number {

    if (eccentricity < 1e-8)
        return 0;

    const cosNu =

        (semiMajorAxis *
        (1 - eccentricity * eccentricity) /
        radius - 1) /
        eccentricity;

    return Math.acos(

        Math.max(

            -1,

            Math.min(

                1,

                cosNu

            )

        )

    );

}