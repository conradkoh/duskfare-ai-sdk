export interface Result<T, E = Error> {
  data: T;
  error: E;
}
