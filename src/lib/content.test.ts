import test from 'node:test';
import { newArrayItem, arrayItemTemplate, fieldPath, matchesField } from './content-fields';
import assert from 'node:assert/strict';
import { changes, replaceAt, modelField } from './content';

test('editing nested fields preserves the saved baseline and neighboring values', () => {
  const source = { value: { title: { vi: 'Tim', en: 'Heart' }, parts: ['FJ1'] } };
  const result = replaceAt(source, ['value', 'title', 'vi'], 'Tim mới');
  assert.deepEqual(changes(source, result), [{ path: '/value/title/vi', before: 'Tim', after: 'Tim mới' }]);
  assert.equal(source.value.title.vi, 'Tim');
});

test('array reordering is reported as a complete before/after change', () => {
  assert.deepEqual(changes(['a', 'b'], ['b', 'a']), [{ path: '', before: ['a', 'b'], after: ['b', 'a'] }]);
});
test('PostgreSQL JSON key ordering does not invent changes inside arrays', () => {
  assert.deepEqual(changes([{ vi: 'Tim', en: 'Heart' }], [{ en: 'Heart', vi: 'Tim' }]), []);
});

test('new options and hotspots receive fresh identities without mutating their templates', () => {
  const source = { id: 'A', text: 'Answer' };
  assert.deepEqual(newArrayItem('options', source, '123'), { id: 'option-123', text: 'Answer' });
  assert.equal(source.id, 'A');
  const hotspot = arrayItemTemplate('hotspots', []);
  assert.ok(hotspot);
  assert.equal((newArrayItem('hotspots', hotspot, '456') as { key: string }).key, 'cms-456');
  assert.equal(fieldPath('/value/twoCol/corpus/title/vi'), 'Nội dung › Hai khối trang chủ › Giải phẫu người › Tiêu đề › Tiếng Việt');
});

test('field search finds translated nested labels, raw field names and empty GLB slots', () => {
  const source = { value: { replacement: { modelFile: '', hotspots: [] }, title: { vi: 'Tim' } } };
  for (const query of ['GLB', 'modelFile', 'tieng viet']) assert.equal(matchesField(source, 'value', query), true);
  assert.equal(matchesField(source, 'value', 'khong ton tai'), false);
});

test('dedicated model editor points to the existing GLB field and preserves surrounding scene data', () => {
  const source = { value: { slug: 'tim', modelFile: '/models/heart.glb', title: 'Tim' } };
  const field = modelField(source);
  assert.ok(field);
  assert.deepEqual(field.path, ['value', 'modelFile']);
  const edited = replaceAt(source, field.path, '/api/content/assets/test');
  assert.deepEqual(changes(source, edited), [{ path: '/value/modelFile', before: '/models/heart.glb', after: '/api/content/assets/test' }]);
  const atlas = { value: { replacement: { modelFile: '', hotspots: [] } } };
  assert.deepEqual(modelField(atlas)?.path, ['value', 'replacement']);
  assert.equal(modelField({ value: { id: 'FJ1', name: 'Heart' } }), null);
});
