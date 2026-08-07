export { usePet } from "./hooks/use-pet";
export { useWalkCycle } from "./hooks/use-walk-cycle";
export { PetAvatar } from "./components/pet-avatar";
export { PetWalkSection } from "./components/pet-walk-section";
export { PetProvider, usePetContext } from "./components/pet-provider";
export type {
  PetState,
  AnimationDefinition,
  CurrentFrame,
  PetPosition,
  PetStats,
  SpriteSheetConfig,
  WalkTarget,
  UsePetConfig,
  UsePetReturn,
} from "./types/pet";
