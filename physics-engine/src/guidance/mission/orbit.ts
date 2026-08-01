export enum OrbitType {

    LEO = "LEO",

    SSO = "SSO",

    MEO = "MEO",

    GEO = "GEO",

    GTO = "GTO",

    HEO = "HEO",

    ESCAPE = "ESCAPE",

    CUSTOM = "CUSTOM"

}

export interface OrbitTarget {

    type: OrbitType;

    apogeeM: number;

    perigeeM: number;

    inclinationDeg: number;

}