// Tự đăng ký hook phân giải "@/..." và import .ts không đuôi cho node --test.
// Bản sao gọn của scripts/ts-resolve.mjs bên Soma_Fe (BO không chia sẻ mã).
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

const ROOT = new URL("../", import.meta.url);

export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const base = new URL("src/" + specifier.slice(2), ROOT);
    for (const cand of [base.href, base.href + ".ts", base.href + "/index.ts"]) {
      if (existsSync(fileURLToPath(cand))) return next(cand, context);
    }
  }
  if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
    const base = new URL(specifier, context.parentURL);
    for (const cand of [base.href + ".ts", base.href + "/index.ts"]) {
      if (existsSync(fileURLToPath(cand))) return next(cand, context);
    }
  }
  return next(specifier, context);
}

register(import.meta.url);
