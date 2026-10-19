import type { Value } from './content';

export const fieldLabels: Record<string, string> = {
  value: 'Nội dung', texts: 'Chữ hiển thị', vi: 'Tiếng Việt', en: 'English', zh: '中文', title: 'Tiêu đề', description: 'Mô tả', intro: 'Giới thiệu', name: 'Tên hiển thị', label: 'Nhãn', note: 'Giải thích', latin: 'Tên Latin', latinName: 'Tên Latin', modelFile: 'Tệp mô hình GLB', hotspots: 'Cấu trúc & chú giải', meshName: 'Mesh liên kết', offset: 'Vị trí nhãn', visibleSystems: 'Các hệ hiển thị', groups: 'Nhóm cấu trúc', parts: 'Mã mảnh atlas', layers: 'Lớp giải phẫu', tint: 'Màu hiển thị', view: 'Góc nhìn', clip: 'Mặt cắt', frameGroups: 'Nhóm căn khung', fadedGroups: 'Nhóm làm mờ', source: 'Nguồn', href: 'Liên kết', img: 'Hình ảnh', image: 'Hình ảnh', stem: 'Câu hỏi', options: 'Phương án', answer: 'Đáp án', answers: 'Các đáp án đúng', explanation: 'Giải thích đáp án', key: 'Mã nhóm', slug: 'Địa chỉ cố định', id: 'Mã cố định', code: 'Mã cố định', on: 'Bật sẵn', position: 'Vị trí', percent: 'Tỷ lệ mặt cắt', keepPositive: 'Giữ phía dương', gradable: 'Cho phép chấm điểm', images: 'Ảnh câu hỏi', explanationImages: 'Ảnh giải thích', text: 'Nội dung phương án',
  replacement: 'Thay thế bằng mô hình riêng', nav: 'Thanh điều hướng', account: 'Menu tài khoản', footer: 'Chân trang', mainMenu: 'Menu chính', vetMenu: 'Menu thú y', twoCol: 'Hai khối trang chủ', corpus: 'Giải phẫu người', anima: 'Giải phẫu động vật', kicker: 'Nhãn đầu khối', meta: 'Dòng thông tin', body: 'Nội dung', cta: 'Nút hành động', humanHero: 'Đầu trang giải phẫu người', hero: 'Đầu trang', sections: 'Tiêu đề các khu', sources: 'Nguồn tham khảo', stats: 'Thông tin dự án', mega: 'Menu khám phá', explore: 'Khám phá', library: 'Thư viện', quiz: 'Trắc nghiệm', signIn: 'Đăng nhập', signOut: 'Đăng xuất', titlePre: 'Tiêu đề · phần đầu', titleAccent: 'Tiêu đề · phần nhấn', titlePost: 'Tiêu đề · phần cuối', lede: 'Đoạn dẫn', axis: 'Trục',
};
export const fieldLabel = (key: string) => fieldLabels[key] ?? key.replace(/([a-z])([A-Z])/g, '$1 $2');
export const fieldPath = (path: string) => path.split('/').filter(Boolean).map((key) => /^\d+$/.test(key) ? `Mục ${Number(key) + 1}` : fieldLabel(key)).join(' › ');

export const normalizeFieldSearch = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase();
export function matchesField(value: Value, key: string, filter: string): boolean {
  const needle = normalizeFieldSearch(filter.trim());
  if (!needle || normalizeFieldSearch(`${key} ${fieldLabel(key)}`).includes(needle)) return true;
  if (value && typeof value === 'object') return Object.entries(value).some(([name, item]) => matchesField(item, name, filter));
  return normalizeFieldSearch(String(value ?? '')).includes(needle);
}

export function arrayItemTemplate(key: string, source: Value | undefined): Value | undefined {
  if (Array.isArray(source) && source.length) return source[0];
  if (key === 'hotspots') return { key: '', meshName: '', offset: [0, 0], label: { vi: '', en: '', zh: '' }, note: { vi: '', en: '', zh: '' }, latinName: '' };
  if (key === 'options') return { id: '', text: '' };
  if (['answers', 'images', 'explanationImages', 'frameGroups', 'fadedGroups'].includes(key)) return '';
  return undefined;
}

export function newArrayItem(key: string, template: Value, suffix: string): Value {
  const item = structuredClone(template);
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    if (typeof item.key === 'string') item.key = `cms-${suffix}`;
    if (key === 'options' && typeof item.id === 'string') item.id = `option-${suffix}`;
  }
  return item;
}
