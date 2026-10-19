import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clinicalDraft, draftChanged, mergeClinicalDrafts } from './pathology-drafts';

test('saving English preserves an unsaved Vietnamese draft and its original revision',()=>{
  const vi=clinicalDraft({revision:'vi-1',description:'Bản gốc'});
  const current={vi:{...vi,description:'Chưa lưu'},en:{...clinicalDraft({revision:'en-1'}),description:'Saved'}};
  const fresh={vi:clinicalDraft({revision:'vi-2',description:'Người khác sửa'}),en:clinicalDraft({revision:'en-2',description:'Saved'})};
  const result=mergeClinicalDrafts(current,fresh,'en');
  assert.equal(result.vi.description,'Chưa lưu');assert.equal(result.vi.expectedRevision,'vi-1');
  assert.equal(result.en.expectedRevision,'en-2');assert.equal(draftChanged(result.en),false);
});
test('citation reload preserves every dirty locale; unchanged locales receive server updates',()=>{
  const vi=clinicalDraft({revision:'a',description:'A'}),en=clinicalDraft({revision:'b',description:'B'});
  const result=mergeClinicalDrafts({vi:{...vi,treatment:'Chưa lưu'},en},{vi:clinicalDraft({revision:'c'}),en:clinicalDraft({revision:'d',description:'New'})});
  assert.equal(result.vi.treatment,'Chưa lưu');assert.equal(result.en.description,'New');
});
test('returning all fields to their baseline removes the dirty flag',()=>{
  const draft=clinicalDraft({revision:'a',description:'A'});
  assert.equal(draftChanged({...draft,description:'B'}),true);assert.equal(draftChanged(draft),false);
});
