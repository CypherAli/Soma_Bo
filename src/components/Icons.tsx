/**
 * Biểu tượng vẽ tay bằng SVG.
 *
 * Không kéo thư viện icon: back office dùng đúng mười lăm hình, mà gói icon nhỏ
 * nhất cũng nặng hơn cả tệp này và bắt người dùng tải về hàng nghìn hình không
 * dùng tới.
 *
 * Mọi hình đều `stroke="currentColor"` và `fill="none"` để đổi màu theo chữ
 * quanh nó — có vậy thì một hình dùng được cả trên sidebar xanh đậm lẫn trên
 * thẻ cảnh báo nền hổ phách.
 */
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const IcoMenu = () => (
  <svg {...base} width="16" height="16">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IcoSearch = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
);

export const IcoBell = () => (
  <svg {...base}>
    <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
    <path d="M10.3 20a2 2 0 0 0 3.4 0" />
  </svg>
);

export const IcoSun = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M2 12h2m16 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  </svg>
);

export const IcoExternal = () => (
  <svg {...base}>
    <path d="M14 4h6v6" />
    <path d="M20 4 10 14" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

export const IcoChevron = () => (
  <svg {...base} width="11" height="11">
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const IcoAlert = () => (
  <svg {...base}>
    <path d="M12 3.5 2.5 20h19L12 3.5Z" />
    <path d="M12 9.5v4.5" />
    <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const IcoCheck = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 2.6 2.6L16 9.5" />
  </svg>
);

export const IcoCross = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6m0-6-6 6" />
  </svg>
);

export const IcoGauge = () => (
  <svg {...base}>
    <path d="M4 18a8 8 0 1 1 16 0" />
    <path d="M12 14.5 15.5 10" />
  </svg>
);

export const IcoStethoscope = () => (
  <svg {...base}>
    <path d="M6 3v5a4 4 0 0 0 8 0V3" />
    <path d="M6 3H4m10 0h2" />
    <path d="M10 12v3a4 4 0 0 0 8 0v-1" />
    <circle cx="18" cy="10" r="2" />
  </svg>
);

export const IcoBone = () => (
  <svg {...base}>
    <path d="M7 17a2.5 2.5 0 1 1-2-4 2.5 2.5 0 0 1 3-3.5l4.5 4.5A2.5 2.5 0 0 1 15 17a2.5 2.5 0 1 1-4 2 2.5 2.5 0 0 1-4-2Z" />
    <path d="M17 7a2.5 2.5 0 1 1 2 4" />
    <path d="m8.5 9.5 6-6" />
  </svg>
);

export const IcoQuiz = () => (
  <svg {...base}>
    <rect x="4" y="3.5" width="16" height="17" rx="2" />
    <path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3" />
    <circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const IcoBook = () => (
  <svg {...base}>
    <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5V4.5Z" />
    <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
  </svg>
);

export const IcoUsers = () => (
  <svg {...base}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.5a3.2 3.2 0 0 1 0 6.4" />
    <path d="M17.5 14.5A5.5 5.5 0 0 1 20.5 20" />
  </svg>
);

export const IcoLog = () => (
  <svg {...base}>
    <path d="M5 4.5h14v15H5z" />
    <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" />
  </svg>
);

export const IcoServer = () => (
  <svg {...base}>
    <rect x="3.5" y="4" width="17" height="6" rx="1.6" />
    <rect x="3.5" y="14" width="17" height="6" rx="1.6" />
    <path d="M7 7h.01M7 17h.01" />
  </svg>
);

export const IcoCheckList = () => (
  <svg {...base}>
    <path d="m3.5 7 2 2 3-3.5" />
    <path d="m3.5 17 2 2 3-3.5" />
    <path d="M12 7h8.5M12 17h8.5" />
  </svg>
);

export const IcoQuote = () => (
  <svg {...base}>
    <path d="M9 7H5.5A1.5 1.5 0 0 0 4 8.5v3A1.5 1.5 0 0 0 5.5 13H8v1.5A2.5 2.5 0 0 1 5.5 17" />
    <path d="M19.5 7H16a1.5 1.5 0 0 0-1.5 1.5v3A1.5 1.5 0 0 0 16 13h2.5v1.5A2.5 2.5 0 0 1 16 17" />
  </svg>
);

export const IcoTranslate = () => (
  <svg {...base}>
    <path d="M3.5 6h8M7.5 4v2" />
    <path d="M10 6c0 3.5-2.6 7-6.5 8.5" />
    <path d="M5 10.5c1.4 2.2 3.4 3.6 5.5 4.2" />
    <path d="m13 20 3.5-9 3.5 9" />
    <path d="M14.3 17h4.4" />
  </svg>
);

export const IcoPulse = () => (
  <svg {...base}>
    <path d="M3 12h3.5l2-5 3 10 2.5-5H21" />
  </svg>
);

export const IcoDoc = () => (
  <svg {...base}>
    <path d="M13.5 3.5H7a1.5 1.5 0 0 0-1.5 1.5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5Z" />
    <path d="M13.5 3.5v5h5" />
    <path d="M9 13h6M9 16.5h4" />
  </svg>
);

export const IcoKey = () => (
  <svg {...base}>
    <circle cx="8" cy="12" r="3.5" />
    <path d="M11.5 12H20" />
    <path d="M17 12v3M20 12v2.5" />
  </svg>
);
