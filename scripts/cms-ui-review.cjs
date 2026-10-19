/* Isolated browser review: real BO bundles/catalog, synthetic session, in-memory drafts.
 * Run after building Soma_Bo and soma_be. Never proxies writes to the real API.
 * node scripts/cms-ui-review.cjs -> http://localhost:3002
 */
const http = require('node:http');
const path = require('node:path');
const { ContentService } = require('../../soma_be/dist/src/content/content.service.js');
const root = path.resolve(__dirname, '../../soma_be');
const states = new Map();
const service = new ContentService({
  siteContent: {
    findMany: async ({ where }) => [...states.values()].filter((state) => where.id.in.includes(state.id)),
    findUnique: async ({ where }) => states.get(where.id) ?? null,
  },
  siteAsset: { findMany: async () => [] },
}, { get: (key) => key === 'CMS_CATALOG_PATH' ? path.join(root, 'resources/cms/catalog.json') : undefined });
const session = { id: 'ui-review', name: 'Kiểm thử giao diện', email: 'review@example.invalid', role: 'super_admin' };
const { AdminService } = require('../../soma_be/dist/src/admin/admin.service.js');
const { AuditService } = require('../../soma_be/dist/src/admin/audit.service.js');
const { SourcesService } = require('../../soma_be/dist/src/admin/sources.service.js');
const sourceRows=[{id:'sample-book',title:'Giáo trình kiểm thử giao diện',publisher:'Nhà xuất bản mẫu',year:2020,url:'https://example.invalid/book',localFile:null,status:'official-link',licenseNote:'Dữ liệu mẫu',checkedAt:new Date(),_count:{citations:1}}];
const article={id:'sample-pathology',slug:'benh-mau-kiem-thu',nameVi:'Bài bệnh kiểm thử',nameEn:'QA article',nameZh:'测试',latin:null,icdCode:null,severity:'info',clinicalSystem:'Tim mạch',source:'Tài liệu mẫu',sourcePage:12,needsReview:true,lesionMesh:null,lesionSystem:null,structureId:null,structure:null,relatedStructures:[],content:['vi','en','zh'].map(locale=>({id:'content-'+locale,pathologyId:'sample-pathology',locale,description:'Nội dung mẫu '+locale,clinical:'',imaging:'',progression:'',treatment:'',machineTranslated:false})),citations:[{id:'sample-citation',pathologyId:'sample-pathology',sourceId:'sample-book',pageOrSection:'12',quote:'Câu trích mẫu',verified:true,verifiedBy:session.email,verifiedAt:new Date(),source:sourceRows[0]}]};
const auditRows=[{id:'sample-log',actorEmail:session.email,action:'update',entity:'medical_source',entityId:'sample-book',entityLabel:sourceRows[0].title,before:{title:'Tên nguồn trước khi sửa'},after:{title:sourceRows[0].title},createdAt:new Date()}];
const fixture={
  pathology:{findUnique:async()=>article,update:async({data})=>Object.assign(article,data),updateMany:async()=>{article.needsReview=true;return{count:1};}},
  pathologyContent:{findUnique:async({where})=>article.content.find(c=>where.id?c.id===where.id:c.locale===where.pathologyId_locale.locale)??null,upsert:async({where,update})=>Object.assign(article.content.find(c=>c.locale===where.pathologyId_locale.locale),update)},
  medicalSource:{findUnique:async({where})=>sourceRows.find(s=>s.id===where.id)??null,findMany:async()=>sourceRows,create:async({data})=>{const source={...data,checkedAt:new Date(),_count:{citations:0}};sourceRows.push(source);return source;},update:async({where,data})=>Object.assign(sourceRows.find(s=>s.id===where.id),data)},
  auditLog:{findUnique:async({where})=>auditRows.find(a=>a.id===where.id)??null,findMany:async()=>auditRows.slice().reverse(),count:async()=>auditRows.length,create:async({data})=>{const log={...data,id:'qa-log-'+auditRows.length,createdAt:new Date()};auditRows.push(log);return log;}}
};
fixture.$transaction=async run=>run(fixture);
const adminAudit=new AuditService(fixture),admin=new AdminService(fixture,adminAudit),library=new SourcesService(fixture,adminAudit);
const bootstrap = `<script>localStorage.setItem('soma3d_bo_token','isolated-ui-review');const reviewFetch=window.fetch.bind(window);window.fetch=(input,init)=>{const url=new URL(typeof input==='string'?input:input.url,location.href);return reviewFetch(url.origin==='http://localhost:4000'?'/__qa'+url.pathname+url.search:input,init)};</script>`;
function json(res, status, value) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); }
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost:3002');
    if (url.pathname.startsWith('/__qa/api/')) {
      const route = url.pathname.slice('/__qa/api'.length);
      if (route === '/auth/me') return json(res, 200, { user: session });
      if(route==='/admin/sources'){
        if(req.method==='GET')return json(res,200,await admin.sources());
        if(req.method==='POST'){
          let body='';for await(const chunk of req)body+=chunk;
          const field=name=>new RegExp('name="'+name+'"\\r\\n\\r\\n([^\\r]*)').exec(body)?.[1];
          const dto=Object.fromEntries(['title','publisher','url','licenseNote','replaceId','expectedRevision'].map(key=>[key,field(key)]));
          if(field('year'))dto.year=Number(field('year'));
          return json(res,200,await library.create(session,dto));
        }
      }
      if(route.startsWith('/admin/sources/')&&req.method==='PATCH'){let body='';for await(const chunk of req)body+=chunk;return json(res,200,await admin.updateSource(session,route.split('/').pop(),JSON.parse(body)));}
      if(route==='/admin/audit')return json(res,200,await adminAudit.list({}));
      if(/^\/admin\/audit\/[^/]+\/restore$/.test(route)){
        const id=route.split('/')[3];if(req.method==='GET')return json(res,200,await adminAudit.restorePreview(id));
        let body='';for await(const chunk of req)body+=chunk;return json(res,200,await adminAudit.restore(session,id,JSON.parse(body).expectedRevision));
      }
      if(route==='/admin/clinical-systems')return json(res,200,[{name:'Tim mạch',count:1}]);
      if(route==='/admin/pathologies')return json(res,200,{items:[{...article,citations:1,locales:['vi','en','zh'],missingLocales:[],machineLocales:[]}],total:1,page:1,pageSize:25});
      if(route==='/admin/pathologies/sample-pathology')return json(res,200,await admin.pathology(article.id));
      if(/^\/admin\/pathologies\/sample-pathology\/content\/(vi|en|zh)$/.test(route)&&req.method==='PUT'){
        let body='';for await(const chunk of req)body+=chunk;return json(res,200,await admin.upsertContent(session,article.id,route.split('/').pop(),JSON.parse(body)));
      }
      if (route === '/admin/users') return json(res, 200, { items: [{ ...session, providers: [], createdAt: new Date().toISOString(), disabledAt: null, _count: { quizAttempts: 0, reviewItems: 0, personalDocs: 0 } }, { id: 'sample-user', name: 'Người học mẫu', email: 'learner@example.invalid', role: 'user', providers: [], createdAt: new Date().toISOString(), disabledAt: null, _count: { quizAttempts: 3, reviewItems: 2, personalDocs: 0 } }], total: 2, page: 1, pageSize: 25 });
      if (route === '/admin/content') return json(res, 200, await service.list(url.searchParams.get('category'), url.searchParams.get('q') ?? '', Number(url.searchParams.get('page') ?? 1), url.searchParams.get('kind') ?? '', url.searchParams.get('scope') ?? 'title'));
      if (route === '/admin/content/models') return json(res, 200, await service.models());
      if (route.startsWith('/admin/content/')) {
        const id = decodeURIComponent(route.slice('/admin/content/'.length));
        if (req.method === 'GET') return json(res, 200, await service.detail(id));
        if (req.method === 'PUT') {
          let body = ''; for await (const chunk of req) body += chunk;
          const data = JSON.parse(body);
          const detail = await service.detail(id);
          if (detail.version !== data.version) return json(res, 409, { message: 'Phiên bản đã thay đổi' });
          states.set(id, { id, draft: data.payload, published: detail.published, version: detail.version + 1, publishedAt: null, updatedAt: new Date().toISOString() });
          return json(res, 200, { version: detail.version + 1 });
        }
      }
      if (route === '/admin/pathologies' || route === '/admin/structures') return json(res, 200, { items: [], total: 0, page: 1, pageSize: 25 });
      return json(res, 503, { message: 'Chỉ phục vụ dữ liệu kiểm thử giao diện.' });
    }
    const upstream = await fetch('http://localhost:3001' + req.url);
    if (upstream.headers.get('content-type')?.includes('text/html')) {
      let html = await upstream.text();
      html = html.replace('<head>', '<head>' + bootstrap).replace('</body>', '<div style="position:fixed;bottom:0;right:0;z-index:99999;background:#fff3cd;color:#533f03;padding:5px 12px;font:12px sans-serif">KIỂM THỬ · Dữ liệu mẫu · Không ghi vào hệ thống thật</div></body>');
      res.writeHead(upstream.status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(html);
    } else {
      res.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream' });
      res.end(Buffer.from(await upstream.arrayBuffer()));
    }
  } catch (error) { json(res, 500, { message: error.message }); }
}).listen(3002, '127.0.0.1', () => console.log('Isolated CMS UI review: http://localhost:3002'));
