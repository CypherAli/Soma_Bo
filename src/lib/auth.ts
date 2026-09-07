/**
 * Phiên đăng nhập của back office.
 *
 * Đây là bản RÚT GỌN của `src/lib/auth.ts` bên Soma_Fe, cố ý không chia sẻ mã:
 * back office chạy ở một origin khác nên nó KHÔNG đọc được localStorage của
 * trang ngoài — token phải tự lấy, tự giữ. Vì thế ở đây có `login()` mà bên kia
 * không cần, và không có phần OAuth (đăng nhập Google/GitHub cho khu quản trị
 * là mở thêm một cửa cho một khu chỉ có vài người dùng).
 *
 * Khoá localStorage cũng khác `soma3d_auth_token` của trang ngoài: hai ứng dụng
 * khác origin thì khoá trùng tên cũng không đụng nhau, nhưng đặt tên khác cho
 * người đọc log đỡ tưởng là một.
 */

const TOKEN_KEY = "soma3d_bo_token";
export const AUTH_CHANGED_EVENT = "soma3d-bo-auth-changed";
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

/** Trang ngoài, để mở từ back office khi cần đối chiếu nội dung thật. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Vai trên back office. Trùng enum `UserRole` của backend, xếp từ thấp lên cao. */
export const ROLES = ["user", "editor", "admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];

/** Bậc quyền hiện tại có với tới `minimum` không. */
export function hasAtLeast(role: Role | undefined, minimum: Role) {
  return role !== undefined && ROLES.indexOf(role) >= ROLES.indexOf(minimum);
}

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type AuthResponse = { token: string; expiresAt: string; user: AuthUser };

export function getToken() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    // Trình duyệt chặn site data (cửa sổ riêng tư, thiết lập chặn) thì đọc là
    // ném lỗi chứ không trả null. Coi như chưa đăng nhập.
    return null;
  }
}

function setToken(token: string | null) {
  try {
    if (token === null) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Không lưu được thì phiên chỉ sống trong tab này — vẫn dùng được, chỉ là
    // tải lại trang phải đăng nhập lại. Thà thế còn hơn chặn hẳn lối vào.
  }
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function clearAuth() {
  setToken(null);
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();

  /*
   * Bọc riêng lỗi MẠNG.
   *
   * `fetch` ném `TypeError: Failed to fetch` khi không nối được tới máy chủ, và
   * để nguyên thì người dùng nhận đúng bốn chữ "Failed to fetch" trên khung
   * đăng nhập — không nói máy chủ nào, không nói phải làm gì. Nguyên nhân gần
   * như luôn là `soma_be` chưa chạy: back office không có cơ sở dữ liệu riêng,
   * nó không làm gì được một mình. Nói thẳng ra kèm địa chỉ đang gọi.
   */
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new Error(
      `Không kết nối được máy chủ API tại ${API_URL} — kiểm tra soma_be đã chạy chưa (cd soma_be && npm start).`,
    );
  }

  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Backend trả `message` là chuỗi, hoặc là MẢNG chuỗi khi ValidationPipe bắt
    // lỗi từng trường. Không xử mảng thì người dùng nhận về "[object Object]"
    // đúng lúc cần biết mình gõ sai ô nào.
    const body = data as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    throw new Error(message || "Không kết nối được máy chủ");
  }
  return data as T;
}

/**
 * Đăng nhập bằng email + mật khẩu.
 *
 * KHÔNG kiểm tra vai ở đây: cứ nhận token đã, việc "đủ quyền vào back office
 * hay không" để `AdminShell` hỏi lại bằng `/auth/me`. Tách ra như vậy thì thông
 * báo cho người dùng nói đúng chuyện — "sai mật khẩu" khác hẳn "mật khẩu đúng
 * nhưng tài khoản không có quyền quản trị".
 */
export async function login(email: string, password: string) {
  const auth = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: email.trim(), password }),
  });
  setToken(auth.token);
  return auth.user;
}

export function me() {
  return apiRequest<{ user: AuthUser }>("/auth/me");
}

export async function logout() {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch {
    // Máy chủ không nhận được lệnh thoát thì phiên vẫn còn hiệu lực bên đó cho
    // tới khi hết hạn — nhưng token phía này phải xoá bằng mọi giá, nếu không
    // bấm "đăng xuất" mà vẫn đang đăng nhập là một lời nói dối với người dùng.
  }
  clearAuth();
}
