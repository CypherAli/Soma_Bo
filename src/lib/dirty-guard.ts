'use client';

import { useEffect } from 'react';

const active = new Set<symbol>();
export function confirmLeaveEditors() {
  return active.size === 0 || window.confirm('Có nội dung chưa lưu. Rời màn hình sẽ bỏ phần đang nhập. Tiếp tục?');
}
export function useDirtyGuard(dirty: boolean, busy = false) {
  useEffect(() => {
    const key = Symbol();
    if (dirty || busy) active.add(key);
    const onUnload = (event: BeforeUnloadEvent) => {
      if (dirty || busy) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => { active.delete(key); window.removeEventListener('beforeunload', onUnload); };
  }, [dirty, busy]);
  return () => !busy && (!dirty || window.confirm('Bỏ phần đang nhập chưa lưu? Chọn Huỷ để tiếp tục sửa.'));
}
