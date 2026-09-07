import { apiRequest, type Role } from "@/lib/auth";

/**
 * Máy khách gọi khu `/api/admin` của backend.
 *
 * Mọi hàm ở đây đều đi qua `apiRequest`, tức là luôn kèm bearer token và luôn
 * ném lỗi mang đúng thông điệp tiếng Việt mà máy chủ trả về. Giao diện chỉ việc
 * bắt lỗi và hiện lên — KHÔNG tự đoán "chắc là không đủ quyền", vì đoán sai thì
 * người dùng đi sửa nhầm chỗ.
 *
 * Không chặn quyền ở đây: chặn thật nằm ở guard phía máy chủ. Phía web chỉ ẩn
 * bớt nút cho đỡ rối, ẩn được không có nghĩa là an toàn.
 */

export type Locale3 = "vi" | "en" | "zh";
export const LOCALES: Locale3[] = ["vi", "en", "zh"];

/** Một mục cụ thể trong thẻ việc-còn-tồn trên bảng điều khiển. */
export type AttentionItem = {
  /** id của BỆNH LÝ (hoặc cấu trúc) để bấm vào là mở đúng bản ghi. */
  id: string;
  title: string;
  subtitle: string | null;
};

export type AttentionBucket = { total: number; items: AttentionItem[] };

/**
 * Các hạng mục việc còn tồn.
 *
 * Backend chỉ trả DỮ LIỆU (số và vài mục mẫu); tiêu đề, màu và đường đi là việc
 * của giao diện — xem `OverviewPanel`. Nhét chữ nghĩa vào backend thì sửa một
 * nhãn cũng phải deploy lại máy chủ.
 */
export type Attention = {
  needsReview: AttentionBucket;
  unverifiedCitations: AttentionBucket;
  machineTranslated: AttentionBucket;
  withoutStructure: AttentionBucket;
  withoutCitation: AttentionBucket;
  structuresMissingDescription: AttentionBucket;
  sourcesAtRisk: AttentionBucket;
};

export type Overview = {
  content: {
    pathologies: number;
    needsReview: number;
    structures: number;
    systems: number;
    species: number;
    sources: number;
    quizQuestions: number;
  };
  locales: { locale: Locale3; filled: number; missing: number }[];
  quality: {
    machineTranslated: number;
    citations: number;
    unverifiedCitations: number;
    pathologiesWithoutCitation: number;
    pathologiesWithoutLesion: number;
  };
  people: { users: number; disabledUsers: number; attempts: number };
  recentAudit: AuditEntry[];
  attention: Attention;
};

export type AuditEntry = {
  id: string;
  actorEmail: string;
  action: string;
  entity: string;
  entityId: string;
  entityLabel: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  disabledAt: string | null;
  createdAt: string;
  providers: string[];
  _count: { quizAttempts: number; personalDocs: number; reviewItems: number };
};

export type PathologyRow = {
  id: string;
  slug: string;
  nameVi: string;
  nameEn: string;
  nameZh: string;
  icdCode: string | null;
  severity: "info" | "warning" | "critical" | null;
  clinicalSystem: string | null;
  needsReview: boolean;
  lesionMesh: string | null;
  lesionSystem: string | null;
  source: string;
  sourcePage: number | null;
  structure: { code: string; nameVi: string } | null;
  citations: number;
  locales: string[];
  missingLocales: Locale3[];
  machineLocales: string[];
};

export type PathologyContent = {
  id: string;
  locale: string;
  description: string | null;
  clinical: string | null;
  imaging: string | null;
  progression: string | null;
  treatment: string | null;
  machineTranslated: boolean;
};

export type MedicalSource = {
  id: string;
  title: string;
  publisher: string;
  year: number | null;
  url: string;
  status: string;
  licenseNote: string | null;
  checkedAt: string;
  _count?: { citations: number };
};

export type Citation = {
  id: string;
  sourceId: string;
  pageOrSection: string | null;
  quote: string | null;
  verified: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  source: MedicalSource;
};

export type PathologyDetail = PathologyRow & {
  content: PathologyContent[];
  citations: Citation[];
  /** Cấu trúc phụ mà bệnh còn ảnh hưởng tới, khác cấu trúc chính `structure`. */
  relatedStructures: {
    structure: { id: string; code: string; nameVi: string };
  }[];
};


export type Species = {
  id: string;
  code: string;
  nameVi: string;
  nameEn: string;
  nameZh: string;
  latin: string | null;
  systems: number;
  structures: number;
};

export type AnatomySystem = {
  id: string;
  code: string;
  nameVi: string;
  nameEn: string;
  nameZh: string;
  latin: string | null;
  order: number;
  species: { id: string; code: string; nameVi: string };
  structures: number;
  quizzes: number;
};

export type StructureRow = {
  id: string;
  code: string;
  meshName: string | null;
  nameVi: string;
  nameEn: string;
  nameZh: string;
  latin: string | null;
  taCode: string | null;
  descriptionVi: string | null;
  descriptionEn: string | null;
  descriptionZh: string | null;
  system: { id: string; code: string; nameVi: string };
  species: { id: string; code: string; nameVi: string };
  parent: { code: string; nameVi: string } | null;
  children: number;
  pathologies: number;
};

export type QuizOption = {
  id: string;
  textVi: string;
  textEn: string;
  textZh: string;
  latin: string | null;
  isCorrect: boolean;
};

export type QuizQuestion = {
  id: string;
  promptVi: string;
  promptEn: string;
  promptZh: string;
  explanation: string | null;
  source: string | null;
  system: { id: string; code: string; nameVi: string };
  options: QuizOption[];
};

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

/** Ghép query string, bỏ hẳn tham số rỗng để URL không có `?q=&page=`. */
function query(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export const adminApi = {
  overview: () => apiRequest<Overview>("/admin/overview"),

  users: (params: { q?: string; page?: number }) =>
    apiRequest<Page<AdminUser>>(`/admin/users${query(params)}`),

  setRole: (id: string, role: Role) =>
    apiRequest<AdminUser>(`/admin/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  setDisabled: (id: string, disabled: boolean) =>
    apiRequest<AdminUser>(`/admin/users/${id}/disabled`, {
      method: "PATCH",
      body: JSON.stringify({ disabled }),
    }),

  pathologies: (params: {
    q?: string;
    clinicalSystem?: string;
    needsReview?: boolean;
    missingLocale?: string;
    page?: number;
  }) => apiRequest<Page<PathologyRow>>(`/admin/pathologies${query(params)}`),

  clinicalSystems: () =>
    apiRequest<{ name: string; count: number }[]>("/admin/clinical-systems"),

  pathology: (id: string) =>
    apiRequest<PathologyDetail>(`/admin/pathologies/${id}`),

  /**
   * Sửa thuộc tính của bản ghi bệnh lý.
   *
   * Không có `lesionMesh`/`lesionSystem`/`slug` — xem `UpdatePathologyMetaDto`
   * bên backend để biết vì sao ba trường đó không mở cho gõ tay.
   */
  updatePathology: (
    id: string,
    body: Partial<
      Pick<
        PathologyRow,
        | "nameVi"
        | "nameEn"
        | "nameZh"
        | "icdCode"
        | "severity"
        | "clinicalSystem"
        | "source"
        | "sourcePage"
      >
    >,
  ) =>
    apiRequest<PathologyRow>(`/admin/pathologies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  saveContent: (
    id: string,
    locale: Locale3,
    body: Partial<Omit<PathologyContent, "id" | "locale">>,
  ) =>
    apiRequest<PathologyContent>(`/admin/pathologies/${id}/content/${locale}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  setReviewed: (id: string, needsReview: boolean) =>
    apiRequest<{ id: string; needsReview: boolean }>(
      `/admin/pathologies/${id}/reviewed`,
      { method: "PATCH", body: JSON.stringify({ needsReview }) },
    ),

  addCitation: (
    id: string,
    body: { sourceId: string; pageOrSection?: string; quote?: string },
  ) =>
    apiRequest<Citation>(`/admin/pathologies/${id}/citations`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  verifyCitation: (id: string, verified: boolean) =>
    apiRequest<Citation>(`/admin/citations/${id}/verified`, {
      method: "PATCH",
      body: JSON.stringify({ verified }),
    }),

  removeCitation: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/admin/citations/${id}`, {
      method: "DELETE",
    }),

  sources: () => apiRequest<MedicalSource[]>("/admin/sources"),

  updateSource: (id: string, body: Partial<MedicalSource>) =>
    apiRequest<MedicalSource>(`/admin/sources/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  // ------------------------------------------- giải phẫu và trắc nghiệm
  //
  // Không có hàm tạo mới hay xoá: loài, hệ và cấu trúc đến từ dữ liệu nguồn và
  // phải khớp với model 3D thật. Xem chú thích ở `AnatomyAdminController`.

  species: () => apiRequest<Species[]>("/admin/species"),

  updateSpecies: (id: string, body: Partial<Species>) =>
    apiRequest<Species>(`/admin/species/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  systems: (params: { speciesId?: string; q?: string }) =>
    apiRequest<AnatomySystem[]>(`/admin/systems${query(params)}`),

  updateSystem: (id: string, body: Partial<AnatomySystem>) =>
    apiRequest<AnatomySystem>(`/admin/systems/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  structures: (params: {
    q?: string;
    systemId?: string;
    speciesId?: string;
    missingDescription?: string;
    page?: number;
  }) => apiRequest<Page<StructureRow>>(`/admin/structures${query(params)}`),

  updateStructure: (
    id: string,
    body: Partial<
      Pick<
        StructureRow,
        | "nameVi"
        | "nameEn"
        | "nameZh"
        | "latin"
        | "taCode"
        | "descriptionVi"
        | "descriptionEn"
        | "descriptionZh"
      >
    >,
  ) =>
    apiRequest<StructureRow>(`/admin/structures/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  /** Neo bệnh lý vào cấu trúc 3D theo MÃ; `null` là bỏ neo. */
  linkStructure: (pathologyId: string, structureCode: string | null) =>
    apiRequest<{ structure: { code: string; nameVi: string } | null }>(
      `/admin/pathologies/${pathologyId}/structure`,
      { method: "PATCH", body: JSON.stringify({ structureCode }) },
    ),

  /** Cấu trúc PHỤ mà bệnh đa cơ quan còn ảnh hưởng tới (nhiều-nhiều). */
  addRelatedStructure: (pathologyId: string, structureCode: string) =>
    apiRequest<{ structure: { code: string; nameVi: string } }>(
      `/admin/pathologies/${pathologyId}/related-structures`,
      { method: "POST", body: JSON.stringify({ structureCode }) },
    ),

  removeRelatedStructure: (pathologyId: string, structureId: string) =>
    apiRequest<{ deleted: boolean }>(
      `/admin/pathologies/${pathologyId}/related-structures/${structureId}`,
      { method: "DELETE" },
    ),

  quizzes: (params: { systemId?: string; q?: string; page?: number }) =>
    apiRequest<Page<QuizQuestion>>(`/admin/quizzes${query(params)}`),

  updateQuiz: (
    id: string,
    body: Partial<
      Pick<
        QuizQuestion,
        "promptVi" | "promptEn" | "promptZh" | "explanation" | "source"
      >
    >,
  ) =>
    apiRequest<QuizQuestion>(`/admin/quizzes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  updateQuizOption: (id: string, body: Partial<QuizOption>) =>
    apiRequest<QuizOption>(`/admin/quiz-options/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  audit: (params: { entity?: string; actorEmail?: string; page?: number }) =>
    apiRequest<Page<AuditEntry>>(`/admin/audit${query(params)}`),
};
