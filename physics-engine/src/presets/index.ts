import { RocketConfig } from "../types";
import { VIKRAM_1 } from "./vikram1";
import { LVM3 } from "./lvm3";

export { VIKRAM_1 } from "./vikram1";
export { LVM3 } from "./lvm3";

export const PRESETS: Record<string, RocketConfig> = {
  [VIKRAM_1.id]: VIKRAM_1,
  [LVM3.id]: LVM3,
};
