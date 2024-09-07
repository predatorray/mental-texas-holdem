import LifecycleManager from "./LifecycleManager";

test('Tear-down hooks are invoked when closing', () => {
  const lcm = new LifecycleManager();
  const dummyResource = {};

  let tearDownHookInvoked = false;
  const tearDownHook = () => {
    tearDownHookInvoked = true;
  };
  const resourceReturned = lcm.register(dummyResource, tearDownHook);
  expect(resourceReturned).toBe(dummyResource);

  lcm.close();
  expect(tearDownHookInvoked).toBeTruthy();
});

test('When there is no tear-down hook', () => {
  const lcm = new LifecycleManager();
  lcm.close();
});
