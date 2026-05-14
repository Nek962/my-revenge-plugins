// AudioFix for Revenge (Discord mobile mod)
// Prevents Discord from switching BT headphones from A2DP to HFP/SCO on voice join
// Compatible with Revenge / Bunny plugin loader

const { patcher } = vendetta;

// Candidate native module names Discord uses for audio management
const AUDIO_MODULE_CANDIDATES = [
  "RCTAudioManager",
  "AudioManager",
  "DCAudioManager",
  "DiscordAudioManager",
  "RNAudioManager",
];

// Methods that trigger A2DP → HFP/SCO switch
const METHODS_TO_BLOCK = [
  "startBluetoothSco",
  "setBluetoothScoOn",
  "setMode",            // blocks MODE_IN_COMMUNICATION (3)
  "setCommunicationDevice", // Android 12+
];

const patches: Array<() => void> = [];
let patchCount = 0;

function log(msg: string) {
  console.log(`[AudioFix] ${msg}`);
}

function discoverAndPatch() {
  // @ts-ignore — vendetta exposes NativeModules via globalThis
  const NativeModules: Record<string, any> =
    (globalThis as any).nativeModuleProxy ??
    (globalThis as any).NativeModules ??
    {};

  // Collect candidate modules (named + scan all)
  const candidates = new Set<string>(AUDIO_MODULE_CANDIDATES);
  for (const key of Object.keys(NativeModules)) {
    const mod = NativeModules[key];
    if (mod && METHODS_TO_BLOCK.some((m) => typeof mod[m] === "function")) {
      candidates.add(key);
    }
  }

  for (const moduleName of candidates) {
    const mod = NativeModules[moduleName];
    if (!mod) continue;

    for (const method of METHODS_TO_BLOCK) {
      if (typeof mod[method] !== "function") continue;

      const unpatch = patcher.instead(
        mod,
        method,
        (args: any[], orig: (...a: any[]) => any) => {
          // Allow setMode unless it's MODE_IN_COMMUNICATION (3)
          if (method === "setMode" && args[0] !== 3) {
            return orig(...args);
          }
          log(`Blocked ${moduleName}.${method}(${args.join(", ")})`);
          return undefined;
        }
      );

      patches.push(unpatch);
      patchCount++;
      log(`Patching ${moduleName}.${method} → no-op`);
    }
  }

  log(`Total patches applied: ${patchCount}`);
  if (patchCount === 0) {
    log(
      "No patches applied! Discord may have changed native module names. " +
      "Please open an issue."
    );
  }
}

export default {
  onLoad() {
    log("Loading AudioFix...");
    try {
      discoverAndPatch();
    } catch (e) {
      log(`Error during patch: ${e}`);
    }
  },

  onUnload() {
    log("Unloading AudioFix, restoring original methods...");
    for (const unpatch of patches) {
      try {
        unpatch();
      } catch (_) {}
    }
    patches.length = 0;
    patchCount = 0;
    log("Unloaded.");
  },
};
