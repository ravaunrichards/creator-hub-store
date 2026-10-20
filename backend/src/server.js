import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import pg from 'pg';
import { registerSchema, loginSchema, appMetadataSchema, safeDisplayName, safePackageFilename } from './validation.js';
import { assertSessionSecret, hashPassword, verifyPassword, issueSession, readSession, setSessionCookie, clearSessionCookie, COOKIE_NAME } from './auth.js';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 3000);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const frontend = path.join(root, 'frontend');
const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(root, 'storage/uploads'));
const maxBytes = Math.max(1, Number(process.env.MAX_UPLOAD_MB || 150)) * 1024 * 1024;
assertSessionSecret(process.env.SESSION_SECRET);
await fs.mkdir(uploadDir, { recursive: true });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 10000 });
await pool.query(await fs.readFile(path.join(root, 'database/schema.sql'), 'utf8'));

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"] } } }));
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: 'draft-7', legacyHeaders: false }));
app.use('/api/developer', rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false }));
const storage = multer.diskStorage({
 destination: (_req, _file, cb) => cb(null, uploadDir),
 filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}-${safePackageFilename(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: maxBytes, files: 1 }, fileFilter: (_req, file, cb) => {
   const ext = path.extname(file.originalname).toLowerCase();
   if (ext !== '.apk') return cb(new Error('Only APK uploads are accepted in this release.'));
   cb(null, true);
} });
function validate(schema, value) { const parsed = schema.safeParse(value); if (!parsed.success) { const e = new Error(parsed.error.issues[0]?.message || 'Invalid input.'); e.status = 400; throw e; } return parsed.data; }
function auth(req, res, next) { const id = readSession(req.cookies?.[COOKIE_NAME]); if (!id) return res.status(401).json({ error: 'Please sign in first.' }); req.userId = id; next(); }
function publicApp(row) { return { id: row.id, name: row.name, packageId: row.package_id, description: row.description, category: row.category, version: row.version, minAndroid: row.min_android, packageSize: Number(row.package_size), createdAt: row.created_at, developerName: row.developer_name }; }

app.get('/api/health', async (_req, res) => { try { await pool.query('SELECT 1'); res.json({ ok: true, database: 'connected' }); } catch { res.status(503).json({ ok: false, database: 'unavailable' }); } });
app.post('/api/auth/register', async (req, res, next) => { try {
 const input = validate(registerSchema, req.body); const id = crypto.randomUUID(); const hash = await hashPassword(input.password);
 const r = await pool.query('INSERT INTO users(id,email,display_name,password_hash) VALUES($1,$2,$3,$4) RETURNING id,email,display_name,role', [id,input.email,safeDisplayName(input.displayName),hash]);
 setSessionCookie(res, issueSession(id)); res.status(201).json({ user: r.rows[0] });
 } catch (e) { if (e.code === '23505') return res.status(409).json({ error: 'An account with that email already exists.' }); next(e); } });
app.post('/api/auth/login', async (req, res, next) => { try {
 const input = validate(loginSchema, req.body); const r = await pool.query('SELECT id,email,display_name,role,password_hash FROM users WHERE email=$1', [input.email]); const u = r.rows[0];
 if (!u || !(await verifyPassword(input.password,u.password_hash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
 setSessionCookie(res, issueSession(u.id)); res.json({ user: { id:u.id,email:u.email,display_name:u.display_name,role:u.role } });
 } catch (e) { next(e); } });
app.post('/api/auth/logout', (_req,res) => { clearSessionCookie(res); res.status(204).end(); });
app.get('/api/auth/me', auth, async (req,res,next) => { try { const r = await pool.query('SELECT id,email,display_name,role FROM users WHERE id=$1',[req.userId]); if (!r.rows[0]) { clearSessionCookie(res); return res.status(401).json({error:'Session expired.'}); } res.json({user:r.rows[0]}); } catch(e){next(e);} });
app.get('/api/apps', async (req,res,next) => { try {
 const q = String(req.query.q || '').trim().slice(0,100); const category = String(req.query.category || '').trim().slice(0,40);
 const r = await pool.query(`SELECT a.*,u.display_name AS developer_name FROM apps a JOIN users u ON u.id=a.developer_id WHERE a.status='published' AND ($1='' OR a.name ILIKE '%' || $1 || '%' OR a.description ILIKE '%' || $1 || '%' OR a.package_id ILIKE '%' || $1 || '%') AND ($2='' OR a.category=$2) ORDER BY a.updated_at DESC LIMIT 100`, [q,category]);
 res.json({ apps:r.rows.map(publicApp) });
 } catch(e){next(e);} });
app.get('/api/apps/:id', async (req,res,next) => { try { const r = await pool.query("SELECT a.*,u.display_name AS developer_name FROM apps a JOIN users u ON u.id=a.developer_id WHERE a.id=$1 AND a.status='published'",[req.params.id]); if (!r.rows[0]) return res.status(404).json({error:'App not found.'}); res.json({app:publicApp(r.rows[0])}); } catch(e){next(e);} });
app.get('/api/developer/apps', auth, async (req,res,next) => { try { const r = await pool.query('SELECT id,name,package_id,description,category,version,min_android,package_size,status,created_at FROM apps WHERE developer_id=$1 ORDER BY created_at DESC',[req.userId]); res.json({apps:r.rows.map(x=>({id:x.id,name:x.name,packageId:x.package_id,description:x.description,category:x.category,version:x.version,minAndroid:x.min_android,packageSize:Number(x.package_size),status:x.status,createdAt:x.created_at}))}); } catch(e){next(e);} });
app.post('/api/developer/apps', auth, upload.single('apk'), async (req,res,next) => {
 let filePath = req.file?.path;
 try {
   if (!req.file) return res.status(400).json({error:'Choose an APK file to upload.'});
   const input = validate(appMetadataSchema, req.body);
   // Verify APK ZIP signature (PK) before accepting it. This is not malware scanning.
   const handle = await fs.open(filePath, 'r'); const head = Buffer.alloc(4); await handle.read(head,0,4,0); await handle.close();
   if (head[0] !== 0x50 || head[1] !== 0x4b) { await fs.unlink(filePath).catch(()=>{}); return res.status(400).json({error:'The uploaded file does not look like an APK/ZIP package.'}); }
   const digest = crypto.createHash('sha256'); const stream = (await import('node:fs')).createReadStream(filePath); for await (const chunk of stream) digest.update(chunk);
   const id = crypto.randomUUID();
   const r = await pool.query('INSERT INTO apps(id,developer_id,name,package_id,description,category,version,min_android,package_filename,package_sha256,package_size,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,\'pending\') RETURNING id,name,package_id,category,version,status,created_at', [id,req.userId,input.name,input.packageId,input.description,input.category,input.version,input.minAndroid,path.basename(filePath),digest.digest('hex'),req.file.size]);
   res.status(201).json({app:r.rows[0],message:'Submitted for review. It is not publicly downloadable until approved by an administrator.'});
 } catch(e) { if (filePath) await fs.unlink(filePath).catch(()=>{}); if(e.code==='23505') return res.status(409).json({error:'You already submitted this package ID.'}); next(e); }
});
app.patch('/api/admin/apps/:id/review', auth, async (req,res,next) => { try {
 const admin = await pool.query("SELECT role FROM users WHERE id=$1", [req.userId]);
 if (admin.rows[0]?.role !== 'admin') return res.status(403).json({error:'Administrator access required.'});
 const status = req.body?.status;
 if (!['published','rejected','suspended'].includes(status)) return res.status(400).json({error:'Status must be published, rejected, or suspended.'});
 const r = await pool.query('UPDATE apps SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING id,name,status', [status,req.params.id]);
 if (!r.rows[0]) return res.status(404).json({error:'App submission not found.'});
 res.json({app:r.rows[0]});
 } catch(e){next(e);} });
app.get('/api/apps/:id/download', async (req,res,next) => { try { const r = await pool.query("SELECT name,package_filename,package_sha256 FROM apps WHERE id=$1 AND status='published'",[req.params.id]); if(!r.rows[0]) return res.status(404).json({error:'Published app not found.'}); const file = path.join(uploadDir,path.basename(r.rows[0].package_filename)); res.setHeader('X-Content-SHA256',r.rows[0].package_sha256); res.download(file, `${safePackageFilename(r.rows[0].name)}.apk`, e => { if(e && !res.headersSent) next(e); }); } catch(e){next(e);} });
app.use(express.static(frontend));
app.get('*', (_req,res) => res.sendFile(path.join(frontend,'index.html')));
app.use((err,_req,res,_next) => { if(res.headersSent) return; const status = Number(err.status) || (err instanceof multer.MulterError ? 400 : 500); if(status >= 500) console.error('Request failed:',err.name || 'Error',status); res.status(status).json({error: status >= 500 ? 'Something went wrong. Please try again.' : err.message}); });
const server = app.listen(port, () => console.log(`Creator Hub Store listening on ${port}`));
async function shutdown(){server.close(); await pool.end();}
process.on('SIGTERM',shutdown); process.on('SIGINT',shutdown);
