// Kiểm thử đơn vị cho phân quyền BO — chạy bằng `npm run test:unit`
// (node --test có sẵn, không thêm phụ thuộc). Sai một bậc ở đây là lộ dữ liệu
// cho người thiếu quyền, nên phải gác bằng test.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasAtLeast, ROLES } from "@/lib/auth";

describe("hasAtLeast", () => {
  it("xếp bậc đúng thứ tự user < editor < admin < super_admin", () => {
    assert.deepEqual([...ROLES], ["user", "editor", "admin", "super_admin"]);
    assert.equal(hasAtLeast("admin", "editor"), true);
    assert.equal(hasAtLeast("editor", "admin"), false);
    assert.equal(hasAtLeast("super_admin", "super_admin"), true);
  });

  it("chưa đăng nhập thì không với tới bất kỳ mức nào", () => {
    assert.equal(hasAtLeast(undefined, "user"), false);
  });
});
