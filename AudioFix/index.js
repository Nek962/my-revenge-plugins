"use strict";
// AudioFix for Revenge
// Prevents Discord from switching BT headphones from A2DP to HFP/SCO during voice calls

const AUDIO_MODULE_CANDIDATES = [
  "RCTAudioManager",
  "AudioManager",
  "DCAudioManager",
  "DiscordAudioManager",
  "RNAudioManager",
  "RTNAudioManager" // Добавлено для новых версий Discord (TurboModules)
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

  // Ищем модули по сигнатурам
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

      const original = mod[method];

      try {
        // Переопределяем свойство жестко через дескриптор, 
        // так как NativeModules часто read-only
        Object.defineProperty(mod, method, {
          value: function (...args) {
            // setMode: блокируем только MODE_IN_COMMUNICATION (3)
            if (method === "setMode" && args[0] !== 3) {
              return original.apply(this, args);
            }
            log("Blocked " + moduleName + "." + method + "(" + args.join(", ") + ")");
            return undefined;
          },
          configurable: true,
          writable: true
        });

        // Сохраняем функцию отката
        patches.push(function () {
          Object.defineProperty(mod, method, {
            value: original,
            configurable: true,
            writable: true
          });
        });

        patchCount++;
        log("Patched " + moduleName + "." + method + " → no-op");
      } catch (err) {
        log("Failed to patch " + moduleName + "." + method + ": " + err.message);
      }
    }
  }

  log("Total patches applied: " + patchCount);
  if (patchCount === 0) {
    log(
      "WARNING: No patches applied! Discord may have changed native module names, " +
      "or the objects are strictly frozen."
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
