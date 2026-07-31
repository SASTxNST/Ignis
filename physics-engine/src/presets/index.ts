import { RocketConfig } from "../types";
import { VIKRAM_1 } from "./vikram1";
import { LVM3 } from "./lvm3";
import { FALCON_9 } from "./falcon9";
import { PSLV_XL } from "./pslv-xl";
import { SSLV } from "./sslv";

export { VIKRAM_1 } from "./vikram1";
export { LVM3 } from "./lvm3";
export { FALCON_9 } from "./falcon9";
export { PSLV_XL } from "./pslv-xl";
export { SSLV } from "./sslv";

export const PRESETS: Record<string, RocketConfig> = {
  [VIKRAM_1.id]: VIKRAM_1,
  [LVM3.id]: LVM3,
  [FALCON_9.id]: FALCON_9,
  [PSLV_XL.id]: PSLV_XL,
  [SSLV.id]: SSLV,
};
