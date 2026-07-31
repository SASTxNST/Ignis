import { PEGTarget } from "./pegTarget";

import { PEGPrediction } from "./pegPredictor";

export interface PEGState {

    prediction: PEGPrediction;

    target: PEGTarget;

    remainingBurnTimeS: number;

    steeringConstantA: number;

    steeringConstantB: number;

}