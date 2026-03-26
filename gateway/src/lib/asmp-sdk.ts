/**
 * Re-exports the upstream TypeScript ASMP server SDK (npm package name unchanged upstream).
 */
export {
  createFetchHandler,
  InMemoryStore,
  SCPWorkflow as ASMPWorkflow,
  type TransitionDef,
} from "scp-sdk";
