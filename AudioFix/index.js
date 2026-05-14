"use strict";
// AudioFix for Revenge
// Prevents Discord from switching BT headphones from A2DP to HFP/SCO during voice calls

const AUDIO_MODULE_CANDIDATES = [
  "RCTAudioManager",
  "AudioManager",
  "DCAudioManager",
  "DiscordAudioManager",
  "RNAudioManager",
];

const METHODS_TO_BLOCK = [
  "startBluetoothSco",
  "setBluetoothScoOn",
  "setMode",
  "setCommunicationDevice",
];

const patches = [];
let patchCount = 0;

function log(msg) {
  console.log("[AudioFix] " + msg);
}

function discoverAndPatch() {
  const NativeModules =
    globalThis.nativeModuleProxy ??
    globalThis.NativeModules ??
    {};

  const candidates = new Set(AUDIO_MODULE_CANDIDATES);

  // Scan all modules for audio methods
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

      const original = mod[method].bind(mod);

      mod[method] = function (...args) {
        // setMode: only block MODE_IN_COMMUNICATION (3), pass others through
        if (method === "setMode" && args[0] !== 3) {
          return original(...args);
        }
        log("Blocked " + moduleName + "." + method + "(" + args.join(", ") + ")");
        return undefined;
      };

      // Store unpatch function
      patches.push(function () {
        mod[method] = original;
      });

      patchCount++;
      log("Patched " + moduleName + "." + method + " → no-op");
    }
  }

  log("Total patches applied: " + patchCount);
  if (patchCount === 0) {
    log(
      "WARNING: No patches applied! Discord may have changed native module names. " +
      "Check NativeModules keys in dev tools and open an issue if needed."
    );
  }
}

module.exports = {
  onLoad() {
    log("AudioFix loading...");
    try {
      discoverAndPatch();
    } catch (e) {
      log("Error during patch: " + e);
    }
  },

  onUnload() {
    log("AudioFix unloading, restoring original methods...");
    for (const unpatch of patches) {
      try { unpatch(); } catch (_) {}
    }
    patches.length = 0;
    patchCount = 0;
    log("Unloaded successfully.");
  },
};
