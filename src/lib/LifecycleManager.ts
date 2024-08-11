export default class LifecycleManager {
  private offHooks: Array<() => void> = [];

  register<T>(managed: T, tearDownHook: (resourceToBeReleasesd: T) => void) {
    this.offHooks.push(() => {
      tearDownHook(managed);
    });
    return managed;
  }

  close() {
    this.offHooks.forEach(hook => hook());
  }
}
