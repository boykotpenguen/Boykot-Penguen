const logTag = "BoykotPenguen";

export function log(...params: unknown[]) {
  console.log(logTag, ...params);
}

export function error(...params: unknown[]) {
  console.error(logTag, ...params);
}

export function warn(...params: unknown[]) {
  console.warn(logTag, ...params);
}
