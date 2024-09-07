export default class LifecycleManager {
  private tearDownHooks: Array<() => void> = [];

  /**
   * Registers a resource with its tear-down hook that is supposed to be invoked when closed
   * @param managed the resource to be managed
   * @param tearDownHook the tear-down hook that will be invoked when closing this manager
   * @returns the same `managed` instance
   */
  register<T>(managed: T, tearDownHook: (resourceToBeReleasesd: T) => void) {
    this.tearDownHooks.push(() => {
      tearDownHook(managed);
    });
    return managed;
  }

  /**
   * Closes all the resources registered in this manager by invoking their tear-down hooks
   */
  close() {
    this.tearDownHooks.forEach(hook => hook());
  }
}
