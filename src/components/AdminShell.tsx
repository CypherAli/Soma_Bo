"use client";

import { confirmLeaveEditors } from "@/lib/dirty-guard";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUTH_CHANGED_EVENT,
  SITE_URL,
  getToken,
  hasAtLeast,
  logout,
  me,
  type AuthUser,
} from "@/lib/auth";
import { adminApi, type Overview } from "@/lib/admin";
import { contentApi, contentKindLabels } from "@/lib/content";
import LoginPanel from "./LoginPanel";
import OverviewPanel from "./OverviewPanel";
import PathologyPanel from "./PathologyPanel";
import AnatomyPanel from "./AnatomyPanel";
import QuizPanel from "./QuizPanel";
import UsersPanel from "./UsersPanel";
import SourcesPanel from "./SourcesPanel";
import AuditPanel from "./AuditPanel";
import SystemPanel from "./SystemPanel";
import ReviewQueuePanel from "./ReviewQueuePanel";
import CitationPanel from "./CitationPanel";
import TranslationPanel from "./TranslationPanel";
import LearningPanel from "./LearningPanel";
import PersonalDocsPanel from "./PersonalDocsPanel";
import SessionsPanel from "./SessionsPanel";
import ProfilePanel from "./ProfilePanel";
import ContentPanel from './ContentPanel';
import {
  IcoBell,
  IcoBone,
  IcoBook,
  IcoCheckList,
  IcoChevron,
  IcoDoc,
  IcoExternal,
  IcoGauge,
  IcoKey,
  IcoLog,
  IcoMenu,
  IcoPulse,
  IcoQuiz,
  IcoQuote,
  IcoSearch,
  IcoServer,
  IcoStethoscope,
  IcoSun,
  IcoTranslate,
  IcoUsers,
} from "./Icons";

export type TabKey =
  | "content"
  | "overview"
  | "system"
  | "review"
  | "citations"
  | "translations"
  | "pathologies"
  | "anatomy"
  | "quizzes"
  | "sources"
  | "learning"
  | "personalDocs"
  | "users"
  | "sessions"
  | "audit"
  | "profile";

/**
 * Yêu cầu "đi tới đúng chỗ này" truyền từ thanh tìm kiếm hoặc từ thẻ trên bảng
 * điều khiển xuống panel tương ứng.
 *
 * Có nó thì bảng điều khiển mới là chỗ BẮT ĐẦU LÀM VIỆC: bấm một bệnh trong thẻ
 * "chưa duyệt" là mở thẳng ngăn soạn của đúng bệnh đó, không phải tự sang tab
 * khác rồi gõ lại tên.
 */
export type Jump =
  | { tab: "pathologies"; pathologyId: string }
  | { tab: "anatomy"; structureQuery: string }
  | { tab: "content"; category: string }
  | { tab: "content"; contentId: string; contentTitle: string }
  | { tab: TabKey };

type Group = {
  label: string;
  tabs: {
    key: TabKey;
    label: string;
    title: string;
    hint: string;
    icon: () => React.ReactElement;
    /** Bậc quyền tối thiểu, khớp với `@MinRole` của backend. */
    min: "editor" | "admin";
  }[];
};

const GROUPS: Group[] = [
  {
    label: 'Website & mô hình',
    tabs: [{ key: 'content', label: 'Mô hình 3D & nội dung', title: 'Mô hình 3D & nội dung website', hint: 'Chọn mô hình để sửa thông tin, thay tệp GLB và cấu hình cảnh · Lưu bản nháp → Xem trước → Xuất bản', icon: IcoBone, min: 'editor' }],
  },
  {
    label: "Quản lý người dùng",
    tabs: [
      {
        key: "users",
        label: "Người dùng",
        title: "Quản lý người dùng",
        hint: "Danh sách tài khoản, hoạt động học tập, phân quyền và khoá tài khoản",
        icon: IcoUsers,
        min: "admin",
      },
    ],
  },
  {
    label: "Theo dõi",
    tabs: [
      {
        key: "overview",
        label: "Tổng quan",
        title: "Tổng quan",
        hint: "Việc còn tồn đọng, từng mục bấm được để làm ngay",
        icon: IcoGauge,
        min: "editor",
      },
      {
        key: "system",
        label: "Tình trạng hệ thống",
        title: "Tình trạng hệ thống",
        hint: "Cơ sở dữ liệu, chỉ số tri thức y khoa, tiến trình máy chủ",
        icon: IcoServer,
        min: "editor",
      },
    ],
  },
  {
    label: "Hàng đợi công việc",
    tabs: [
      {
        key: "review",
        label: "Chờ duyệt",
        title: "Hàng chờ duyệt chuyên môn",
        hint: "Chọn nhiều bài và duyệt một lượt — chỉ bài đã đủ điều kiện",
        icon: IcoCheckList,
        min: "editor",
      },
      {
        key: "citations",
        label: "Đối chiếu trích dẫn",
        title: "Đối chiếu trích dẫn",
        hint: "Mở sách ra và tick từng dòng; xem được trang và câu trích ngay tại bảng",
        icon: IcoQuote,
        min: "editor",
      },
      {
        key: "translations",
        label: "Bàn dịch",
        title: "Bàn dịch",
        hint: "Bản đích đặt cạnh bản gốc tiếng Việt trên cùng màn hình",
        icon: IcoTranslate,
        min: "editor",
      },
    ],
  },
  {
    label: "Nội dung y khoa",
    tabs: [
      {
        key: "pathologies",
        label: "Bệnh lý",
        title: "Bệnh lý",
        hint: "Nội dung ba ngôn ngữ, trích dẫn, neo cấu trúc 3D và duyệt chuyên môn",
        icon: IcoStethoscope,
        min: "editor",
      },
      {
        key: "anatomy",
        label: "Giải phẫu",
        title: "Loài · Hệ cơ quan · Cấu trúc",
        hint: "Tên ba ngôn ngữ, tên Latin, mã TA và mô tả",
        icon: IcoBone,
        min: "editor",
      },
      {
        key: "quizzes",
        label: "Trắc nghiệm",
        title: "Câu hỏi trắc nghiệm",
        hint: "Ngân hàng câu hỏi website và câu hỏi theo hệ cơ quan",
        icon: IcoQuiz,
        min: "editor",
      },
      {
        key: "sources",
        label: "Tài liệu y khoa",
        title: "Tài liệu y khoa",
        hint: "Nguồn tham khảo · Xem tài liệu gốc và quản lý thông tin nguồn",
        icon: IcoBook,
        min: "editor",
      },
    ],
  },
  {
    label: "Người học",
    tabs: [
      {
        key: "learning",
        label: "Hoạt động học tập",
        title: "Hoạt động học tập",
        hint: "Số liệu tổng hợp — không có hồ sơ của từng người",
        icon: IcoPulse,
        min: "admin",
      },
      {
        key: "personalDocs",
        label: "Tài liệu cá nhân",
        title: "Tài liệu cá nhân",
        hint: "Chỉ phần kê khai và trạng thái bóc; không có nội dung tài liệu",
        icon: IcoDoc,
        min: "admin",
      },
    ],
  },
  {
    label: "Hệ thống",
    tabs: [
      {
        key: "sessions",
        label: "Phiên đăng nhập",
        title: "Phiên đăng nhập",
        hint: "Phiên còn hiệu lực; thu hồi được từng phiên",
        icon: IcoKey,
        min: "admin",
      },
      {
        key: "audit",
        label: "Nhật ký",
        title: "Nhật ký thao tác",
        hint: "Ai đã đổi gì, đổi lúc nào, giá trị trước khi đổi",
        icon: IcoLog,
        min: "admin",
      },
      {
        key: "profile",
        label: "Hồ sơ của tôi",
        title: "Hồ sơ của tôi",
        hint: "Quyền đang có và đổi mật khẩu",
        icon: IcoUsers,
        min: "editor",
      },
    ],
  },
];

type SearchHit = {
  kind: "pathology" | "structure" | "content";
  id: string;
  title: string;
  subtitle: string;
};

export default function AdminShell() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<TabKey>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  /*
   * `narrow` mang hai nghĩa theo bề rộng màn hình, cố ý dùng CHUNG một cờ:
   * màn rộng = thanh bên thu về dải biểu tượng; màn hẹp = thanh bên đóng hẳn.
   * Hai cờ riêng thì phải nghĩ tới bốn trạng thái, mà người dùng chỉ thấy một
   * cái nút.
   *
   * Khởi tạo theo bề rộng thật: mở sẵn thanh bên trên điện thoại là che mất
   * toàn bộ nội dung ngay khi vào trang.
   */
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= 900,
  );
  const [closed, setClosed] = useState<string[]>([]);
  const [jump, setJump] = useState<Jump | null>(null);

  useEffect(() => {
    let small = window.innerWidth <= 900;
    const resize = () => {
      const next = window.innerWidth <= 900;
      if (next !== small) { small = next; setNarrow(next); }
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchRevision = useRef(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let revision = 0;
    const load = async () => {
      const current = ++revision;
      // Nhường một nhịp trước khi chạm vào state, đúng quy ước đã dùng ở
      // `HomeNav` bên Soma_Fe: gọi setState ĐỒNG BỘ trong thân effect thì React
      // Compiler báo lỗi "cascading renders", và cảnh báo đó đúng.
      await Promise.resolve();
      const token = getToken();
      if (!token) {
        setUser(null);
        setChecking(false);
        return;
      }
      try {
        const result = await me();
        if (current === revision && getToken() === token) setUser(result.user);
      } catch {
        if (current === revision) setUser(null);
      } finally {
        if (current === revision) setChecking(false);
      }
    };
    void load();
    window.addEventListener(AUTH_CHANGED_EVENT, load);
    return () => {
      revision += 1;
      window.removeEventListener(AUTH_CHANGED_EVENT, load);
    };
  }, []);

  const refreshOverview = useCallback(async () => {
    try {
      const data = await adminApi.overview();
      setOverview(data);
    } catch {
      // Số liệu tổng quan hỏng thì các tab khác vẫn dùng được — không dựng rào
      // chắn cả trang chỉ vì một widget đếm số.
    }
  }, []);

  const allowed = hasAtLeast(user?.role, "editor");

  useEffect(() => {
    if (!allowed) return;
    async function run() {
      await Promise.resolve();
      await refreshOverview();
    }
    void run();
  }, [allowed, refreshOverview]);

  // Ctrl/Cmd+K để nhảy vào ô tìm kiếm, Escape để đóng bảng kết quả. Người soạn
  // dùng bàn phím là chính; với tay ra chuột để tìm là quãng đường thừa lặp lại
  // vài trăm lần một buổi.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (event.key === "Escape") { searchRevision.current += 1; setHits(null); setSearching(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Bấm ra ngoài thì đóng bảng kết quả.
  useEffect(() => {
    if (hits === null) return;
    const onDown = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) { searchRevision.current += 1; setHits(null); setSearching(false); }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [hits]);

  /** Each source can fail independently; an older query must never replace the current one. */
  const runSearch = async () => {
    const revision = ++searchRevision.current;
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    setSearchError("");
    setHits([]);
    try {
      const results = await Promise.allSettled([
        adminApi.pathologies({ q }),
        adminApi.structures({ q }),
        contentApi.list('', q, 1),
      ]);
      if (revision !== searchRevision.current) return;
      const [pathologies, structures, content] = results;
      if (results.some((result) => result.status === 'rejected')) setSearchError('Một số nguồn tìm kiếm chưa tải được. Bấm Enter để thử lại.');
      setHits([
        ...(content.status === 'fulfilled' ? content.value.items.slice(0, 6).map<SearchHit>((row) => ({
          kind: 'content', id: row.id, title: row.title,
          subtitle: [contentKindLabels[row.kind ?? ''], row.identifier].filter(Boolean).join(' · '),
        })) : []),
        ...(pathologies.status === 'fulfilled' ? pathologies.value.items.slice(0, 6).map<SearchHit>((p) => ({
          kind: "pathology",
          id: p.id,
          title: p.nameVi,
          subtitle: [p.slug, p.clinicalSystem].filter(Boolean).join(" · "),
        })) : []),
        ...(structures.status === 'fulfilled' ? structures.value.items.slice(0, 6).map<SearchHit>((st) => ({
          kind: "structure",
          id: st.code,
          title: st.nameVi,
          subtitle: `${st.code} · ${st.system.nameVi}`,
        })) : []),
      ]);
    } catch {
      if (revision === searchRevision.current) setSearchError('Không tải được kết quả. Bấm Enter để thử lại.');
    } finally {
      if (revision === searchRevision.current) setSearching(false);
    }
  };

  const initializedLocation = useRef(false);
  useEffect(() => {
    if (!user || initializedLocation.current) return;
    initializedLocation.current=true;
    const read = () => {
      const params=new URLSearchParams(window.location.search), key=params.get('tab') as TabKey;
      const allowed=GROUPS.flatMap(g=>g.tabs).find(t=>t.key===key && hasAtLeast(user.role,t.min));
      if (!allowed) return;
      setTab(key);
      if(key==='content' && params.get('contentId')) setJump({tab:'content',contentId:params.get('contentId')!,contentTitle:''});
      else if(key==='content' && params.get('category')) setJump({tab:'content',category:params.get('category')!});
      else if(key==='pathologies' && params.get('pathologyId')) setJump({tab:'pathologies',pathologyId:params.get('pathologyId')!});
      else if(key==='anatomy' && params.get('q')) setJump({tab:'anatomy',structureQuery:params.get('q')!});
    };
    queueMicrotask(read);
  },[user]);
  useEffect(()=>{
    const back=()=>{
      if(!user)return;
      if(!confirmLeaveEditors()){window.history.forward();return;}
      const params=new URLSearchParams(window.location.search), key=(params.get('tab')??'overview') as TabKey;
      if(!GROUPS.flatMap(g=>g.tabs).some(t=>t.key===key && hasAtLeast(user.role,t.min)))return;
      setTab(key);
      if(key==='content' && params.get('contentId'))setJump({tab:'content',contentId:params.get('contentId')!,contentTitle:''});
      else if(key==='pathologies' && params.get('pathologyId'))setJump({tab:'pathologies',pathologyId:params.get('pathologyId')!});
      else if(key==='content' && params.get('category'))setJump({tab:'content',category:params.get('category')!});
      else setJump({tab:key});
    };
    window.addEventListener('popstate',back);return()=>window.removeEventListener('popstate',back);
  },[user]);
  const go = (target: Jump) => {
    if(!(target.tab==='content' && tab==='content') && !confirmLeaveEditors()) return;
    const params=new URLSearchParams({tab:target.tab});
    if('contentId' in target) params.set('contentId',target.contentId);
    if('category' in target) params.set('category',target.category);
    if('pathologyId' in target) params.set('pathologyId',target.pathologyId);
    if('structureQuery' in target) params.set('q',target.structureQuery);
    window.history.pushState(null,'','?'+params.toString());
    searchRevision.current += 1;
    setTab(target.tab);
    setJump(target);
    setHits(null);
    setSearching(false);
    if (window.innerWidth <= 900) setNarrow(true);
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("soma3d-theme", next);
    } catch {
      // Không lưu được thì lựa chọn chỉ sống tới khi tải lại trang.
    }
  };

  if (checking) {
    return (
      <div className="bo-gate">
        <div>
          <p>Đang kiểm tra quyền truy cập…</p>
        </div>
      </div>
    );
  }

  // Chưa đăng nhập thì HIỆN LUÔN form, không phải một trang trung gian có nút
  // dẫn sang chỗ khác: back office không còn trang ngoài nào để dẫn tới.
  if (!user) return <LoginPanel onDone={() => setChecking(true)} />;

  if (!allowed) {
    return (
      <div className="bo-gate">
        <div>
          <h1>Không đủ quyền</h1>
          <p>
            Tài khoản <b>{user.email}</b> đang ở mức <b>{user.role}</b>. Khu quản
            trị cần từ mức <b>editor</b> trở lên — liên hệ super admin để được
            cấp quyền.
          </p>
          <button
            type="button"
            className="bo-btn"
            onClick={() => {
              void logout();
              setUser(null);
            }}
          >
            Đăng nhập tài khoản khác
          </button>
        </div>
      </div>
    );
  }

  const groups = GROUPS.map((group) => ({
    ...group,
    tabs: group.tabs.filter((t) => hasAtLeast(user.role, t.min)),
  })).filter((group) => group.tabs.length > 0);

  const visible = groups.flatMap((g) => g.tabs);
  const current = visible.find((t) => t.key === tab) ?? visible[0];

  /** Số việc còn tồn hiện cạnh tên khu. Không có số thì không hiện gì. */
  const badge = (key: TabKey) => {
    if (!overview) return null;
    const a = overview.attention;
    if (key === "pathologies") {
      return a.needsReview.total || null;
    }
    if (key === "anatomy") {
      return a.structuresMissingDescription.total || null;
    }
    if (key === "sources") {
      return a.sourcesAtRisk.total || null;
    }
    if (key === "review") return a.needsReview.total || null;
    if (key === "citations") return a.unverifiedCitations.total || null;
    if (key === "translations") return a.machineTranslated.total || null;
    if (key === "users") {
      return overview.people.disabledUsers || null;
    }
    return null;
  };

  /** Tổng việc tồn, hiện trên chuông. */
  const pending = overview
    ? Object.values(overview.attention).reduce((sum, x) => sum + x.total, 0)
    : 0;

  return (
    <div className={`bo${narrow ? " is-narrow" : ""}`}>
      <div className="bo-brandbar">
        <button
          type="button"
          className="bo-burger"
          aria-label="Thu gọn hoặc mở thanh bên"
          onClick={() => setNarrow((n) => !n)}
        >
          <IcoMenu />
        </button>
        <div>
          <b>SOMA 3D</b>
          <span>Back office</span>
        </div>
      </div>

      <header className="bo-topbar">
        {/* Nút mở thanh bên cho MÀN HẸP. Trên màn hẹp `.bo-brandbar` bị ẩn, mà
            nút kia nằm trong đó — thiếu nút này thì không còn cách nào mở menu,
            trang thành một màn cụt. CSS ẩn nó trên màn rộng. */}
        <button
          type="button"
          className="bo-burger bo-burger-m"
          aria-label="Mở thanh bên"
          onClick={() => setNarrow((n) => !n)}
        >
          <IcoMenu />
        </button>
        <div className="bo-search" ref={searchRef}>
          <IcoSearch />
          <input
            ref={inputRef}
            value={query}
            placeholder="Tìm mô hình, bệnh lý, cấu trúc…"
            aria-label="Tìm mô hình, bệnh lý hoặc cấu trúc; bấm Enter để tìm"
            onChange={(event) => { searchRevision.current += 1; setQuery(event.target.value); setHits(null); setSearchError(''); setSearching(false); }}
            onKeyDown={(event) => {
              if (event.key === "Enter") void runSearch();
            }}
          />
          <kbd>Ctrl K</kbd>
          <button className="bo-btn small" type="button" onClick={() => void runSearch()} disabled={searching}>Tìm</button>
          {hits !== null && (
            <div className="bo-results">
              {searching && <p>Đang tìm…</p>}
              {searchError && <p role="alert">{searchError}</p>}
              {!searching && hits.length === 0 && (
                <p>
                  {query.trim().length < 2
                    ? "Gõ ít nhất hai ký tự rồi bấm Enter."
                    : searchError ? "Chưa có kết quả từ các nguồn đã tải." : "Không có kết quả nào."}
                </p>
              )}
              {!searching && hits.some((h) => h.kind === 'content') && <><b>Mô hình & nội dung website</b>{hits.filter((h) => h.kind === 'content').map((hit) => <button key={hit.id} type="button" onClick={() => go({ tab: 'content', contentId: hit.id, contentTitle: hit.title })}><strong>{hit.title}</strong><em>{hit.subtitle}</em></button>)}</>}
              {!searching &&
                hits.some((h) => h.kind === "pathology") && (
                  <>
                    <b>Bệnh lý</b>
                    {hits
                      .filter((h) => h.kind === "pathology")
                      .map((hit) => (
                        <button
                          key={hit.id}
                          type="button"
                          onClick={() =>
                            go({ tab: "pathologies", pathologyId: hit.id })
                          }
                        >
                          <strong>{hit.title}</strong>
                          <em>{hit.subtitle}</em>
                        </button>
                      ))}
                  </>
                )}
              {!searching &&
                hits.some((h) => h.kind === "structure") && (
                  <>
                    <b>Cấu trúc giải phẫu</b>
                    {hits
                      .filter((h) => h.kind === "structure")
                      .map((hit) => (
                        <button
                          key={hit.id}
                          type="button"
                          onClick={() =>
                            go({ tab: "anatomy", structureQuery: hit.id })
                          }
                        >
                          <strong>{hit.title}</strong>
                          <em>{hit.subtitle}</em>
                        </button>
                      ))}
                  </>
                )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="bo-iconbtn"
          title={
            pending > 0
              ? `${pending} việc còn tồn — mở Tổng quan`
              : "Không còn việc tồn nào"
          }
          aria-label="Việc còn tồn"
          onClick={() => go({ tab: "overview" })}
        >
          <IcoBell />
          {pending > 0 && <i>{pending > 999 ? "999+" : pending}</i>}
        </button>
        <button
          type="button"
          className="bo-iconbtn"
          title="Đổi nền sáng / tối"
          aria-label="Đổi nền sáng tối"
          onClick={toggleTheme}
        >
          <IcoSun />
        </button>
        <a
          className="bo-iconbtn"
          href={SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Mở trang ngoài"
          aria-label="Mở trang ngoài"
        >
          <IcoExternal />
        </a>
        <span className="bo-avatar" title={`${user.name} · ${user.role}`}>
          {user.name.trim().charAt(0) || "?"}
        </span>
      </header>

      <aside className="bo-side">
        <nav className="bo-nav">
          {groups.map((group) => {
            const open = !closed.includes(group.label);
            return (
              <div
                key={group.label}
                className={`bo-nav-group${open ? " is-open" : ""}`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setClosed((list) =>
                      list.includes(group.label)
                        ? list.filter((x) => x !== group.label)
                        : [...list, group.label],
                    )
                  }
                >
                  <span>{group.label}</span>
                  <IcoChevron />
                </button>
                {open && (
                  <ul>
                    {group.tabs.map((t) => {
                      const count = badge(t.key);
                      const Icon = t.icon;
                      return (
                        <li key={t.key}>
                          <button
                            type="button"
                            className={t.key === current.key ? "is-on" : ""}
                            title={t.label}
                            onClick={() => go({ tab: t.key })}
                          >
                            <span className="bo-ico-wrap">
                              <Icon />
                            </span>
                            <span>{t.label}</span>
                            {count !== null && <em>{count}</em>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
        <div className="bo-me">
          <b>{user.name}</b>
          <span>{user.email}</span>
          <span className="bo-tag">{user.role}</span>
          <button
            type="button"
            onClick={() => {
              // Gọi cả API: chỉ xoá token phía này thì phiên vẫn sống trên máy
              // chủ tới 30 ngày, ai lấy được token cũ vẫn dùng được.
              void logout();
              setUser(null);
            }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="bo-main">
        <div className="bo-head">
          <div>
            <h1>{current.title}</h1>
            <p>{current.hint}</p>
          </div>
        </div>
        <div className="bo-body">
          {current.key === 'content' && <ContentPanel role={user.role} jump={jump} onJumpDone={() => setJump(null)} />}
          {current.key === "overview" && (
            <OverviewPanel
              data={overview}
              onRefresh={refreshOverview}
              onJump={go}
            />
          )}
          {current.key === "pathologies" && (
            <PathologyPanel
              role={user.role}
              onChanged={refreshOverview}
              jump={jump}
              onJumpDone={() => setJump(null)}
            />
          )}
          {current.key === "anatomy" && (
            <AnatomyPanel jump={jump} onJumpDone={() => setJump(null)} />
          )}
          {current.key === "system" && <SystemPanel />}
          {current.key === "review" && (
            <ReviewQueuePanel
              canApprove={hasAtLeast(user.role, "admin")}
              onChanged={refreshOverview}
              onJump={go}
            />
          )}
          {current.key === "citations" && (
            <CitationPanel
              canVerify={hasAtLeast(user.role, "admin")}
              onChanged={refreshOverview}
              onJump={go}
            />
          )}
          {current.key === "translations" && (
            <TranslationPanel onChanged={refreshOverview} />
          )}
          {current.key === "learning" && <LearningPanel />}
          {current.key === "personalDocs" && <PersonalDocsPanel />}
          {current.key === "sessions" && <SessionsPanel me={user} />}
          {current.key === "profile" && <ProfilePanel me={user} />}
          {current.key === "quizzes" && <QuizPanel onWebsite={() => go({tab:"content",category:"quizzes"})} />}
          {current.key === "sources" && <SourcesPanel />}
          {current.key === "users" && (
            <UsersPanel me={user} onChanged={refreshOverview} />
          )}
          {current.key === "audit" && <AuditPanel />}
        </div>
      </main>
    </div>
  );
}
