#import <AppKit/AppKit.h>
#include <node_api.h>
#include <cstring>

// Main-process-only bridge. The handle is Electron's NSView*, never renderer input.
static NSWindow* windowFromArgs(napi_env env, napi_callback_info info,
                                bool needsEnabled, bool* enabled) {
  size_t argc = 2;
  napi_value args[2];
  if (napi_get_cb_info(env, info, &argc, args, nullptr, nullptr) != napi_ok ||
      argc < (needsEnabled ? 2u : 1u) || ![NSThread isMainThread]) {
    napi_throw_type_error(env, nullptr, "Expected a window handle on the main thread");
    return nil;
  }
  bool isBuffer = false;
  void* data = nullptr;
  size_t length = 0;
  if (napi_is_buffer(env, args[0], &isBuffer) != napi_ok || !isBuffer ||
      napi_get_buffer_info(env, args[0], &data, &length) != napi_ok ||
      length != sizeof(void*)) {
    napi_throw_type_error(env, nullptr, "Invalid native window handle");
    return nil;
  }
  if (needsEnabled && napi_get_value_bool(env, args[1], enabled) != napi_ok) {
    napi_throw_type_error(env, nullptr, "Expected a boolean visibility preference");
    return nil;
  }
  void* pointer = nullptr;
  std::memcpy(&pointer, data, sizeof(pointer));
  if (!pointer) { napi_throw_error(env, nullptr, "Empty window handle"); return nil; }
  NSView* view = (__bridge NSView*)pointer;
  NSWindow* window = view.window;
  if (!window || ![NSApp.windows containsObject:window]) {
    napi_throw_error(env, nullptr, "Window no longer belongs to Moss");
    return nil;
  }
  return window;
}
static napi_value describe(napi_env env, NSWindow* window) {
  napi_value result; napi_create_object(env, &result);
  auto put = [&](const char* key, bool value) {
    napi_value flag; napi_get_boolean(env, value, &flag);
    napi_set_named_property(env, result, key, flag);
  };
  const auto behavior = window.collectionBehavior;
  put("allSpaces", behavior & NSWindowCollectionBehaviorCanJoinAllSpaces);
  put("fullScreenAuxiliary", behavior & NSWindowCollectionBehaviorFullScreenAuxiliary);
  put("hidesOnDeactivate", window.hidesOnDeactivate);
  put("nonActivating", window.styleMask & NSWindowStyleMaskNonactivatingPanel);
  if (@available(macOS 13.0, *)) {
    put("joinsOtherApps", behavior & NSWindowCollectionBehaviorCanJoinAllApplications);
    put("stageManagerSupported", true);
  } else { put("joinsOtherApps", false); put("stageManagerSupported", false); }
  return result;
}
static napi_value configure(napi_env env, napi_callback_info info) {
  bool enabled = false;
  NSWindow* window = windowFromArgs(env, info, true, &enabled);
  if (!window) return nullptr;
  auto behavior = window.collectionBehavior;
  behavior &= ~(NSWindowCollectionBehaviorCanJoinAllSpaces |
                NSWindowCollectionBehaviorMoveToActiveSpace |
                NSWindowCollectionBehaviorFullScreenPrimary |
                NSWindowCollectionBehaviorFullScreenAuxiliary |
                NSWindowCollectionBehaviorFullScreenNone);
  behavior |= enabled ? (NSWindowCollectionBehaviorCanJoinAllSpaces |
                          NSWindowCollectionBehaviorFullScreenAuxiliary)
                      : NSWindowCollectionBehaviorFullScreenNone;
  if (@available(macOS 13.0, *)) {
    behavior &= ~(NSWindowCollectionBehaviorPrimary |
                  NSWindowCollectionBehaviorAuxiliary |
                  NSWindowCollectionBehaviorCanJoinAllApplications);
    if (enabled) behavior |= NSWindowCollectionBehaviorCanJoinAllApplications;
  }
  window.hidesOnDeactivate = NO;
  window.collectionBehavior = behavior;
  return describe(env, window);
}
static napi_value inspect(napi_env env, napi_callback_info info) {
  bool unused = false;
  NSWindow* window = windowFromArgs(env, info, false, &unused);
  return window ? describe(env, window) : nullptr;
}
static napi_value init(napi_env env, napi_value exports) {
  napi_property_descriptor methods[] = {
    {"configure", nullptr, configure, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"inspect", nullptr, inspect, nullptr, nullptr, nullptr, napi_default, nullptr}
  };
  napi_define_properties(env, exports, 2, methods);
  return exports;
}
NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
