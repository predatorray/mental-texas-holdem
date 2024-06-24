export default class Deferred<T> {
  public readonly promise: Promise<T>;
  public readonly resolve: (value: T | PromiseLike<T>) => void;
  public readonly reject: (reason?: any) => void;

  constructor() {
    let res: (value: T | PromiseLike<T>) => void;
    let rej: (reason?: any) => void;
    this.promise = new Promise<T>((resolve, reject) => {
      res = resolve;
      rej = reject;
    });
    this.resolve = res!;
    this.reject = rej!;
  }
}
