export type ClinicalDraft = {
  description:string;clinical:string;imaging:string;progression:string;treatment:string;
  machineTranslated:boolean;expectedRevision:string;baseline:string;
};
export function draftChanged(draft:ClinicalDraft) {
  const {baseline,...values}=draft;
  return JSON.stringify(values)!==baseline;
}
export function clinicalDraft(content?:Partial<Omit<ClinicalDraft,'expectedRevision'|'baseline'>>&{revision:string}):ClinicalDraft {
  const values={description:content?.description??'',clinical:content?.clinical??'',imaging:content?.imaging??'',progression:content?.progression??'',treatment:content?.treatment??'',machineTranslated:content?.machineTranslated??false,expectedRevision:content?.revision??'missing'};
  return {...values,baseline:JSON.stringify(values)};
}
export function mergeClinicalDrafts(current:Record<string,ClinicalDraft>,incoming:Record<string,ClinicalDraft>,savedLocale?:string) {
  return Object.fromEntries(Object.entries(incoming).map(([locale,next])=>[locale,current[locale]&&draftChanged(current[locale])&&locale!==savedLocale?current[locale]:next]));
}
