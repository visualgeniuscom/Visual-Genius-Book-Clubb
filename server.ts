import express, { Request, Response } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ==========================================
// In-Memory Database (Persistent during container run)
// ==========================================

interface BookRecord {
  id: string;
  title: string;
  author: string;
  page_count: number | null;
  description: string | null;
  formats: Record<string, any>;
  age_bands: string[];
  topics: string[];
  personality: string | null;
  moods: string[];
  hobbies: string[];
  ebook_file_name?: string | null;
  ebook_file_size_kb?: number | null;
  ebook_file_path?: string | null;
  audiobook_file_name?: string | null;
  audiobook_file_size_kb?: number | null;
  audiobook_file_path?: string | null;
  created_at: string;
}

interface RegistrationRecord {
  id: string;
  first_name: string;
  age: number;
  age_band: string;
  guardian_email: string;
  personal_email: string | null;
  username: string;
  security_question: string;
  security_answer_hash: string;
  security_answer_salt: string;
  formats: string[];
  length: string;
  hobbies: string[];
  topics: string[];
  personality: string;
  mood: string;
  admired: string | null;
  skip_list: string | null;
  reset_code?: string | null;
  reset_code_expires_at?: string | null;
  created_at: string;
}

interface SessionRecord {
  id: string;
  registration_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

// Initial Sample Books
const INITIAL_BOOKS: BookRecord[] = [
  {
    id: 'b1-compound-effect',
    title: 'The Compound Effect',
    author: 'Darren Hardy',
    page_count: 208,
    description: 'Small, consistent choices compound into big results over time.',
    formats: { physical: { available: true, copies: 3 }, ebook: { available: true }, audiobook: { available: false } },
    age_bands: ['Builders', 'Trailblazers'],
    topics: ['growth'],
    personality: 'practical',
    moods: ['Build a skill or habit'],
    hobbies: ['Sports', 'Entrepreneurship'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'b2-mere-christianity',
    title: 'Mere Christianity',
    author: 'C.S. Lewis',
    page_count: 256,
    description: 'A classic case for Christian belief and what it means to follow Jesus.',
    formats: { physical: { available: true, copies: 2 }, ebook: { available: true }, audiobook: { available: true } },
    age_bands: ['Trailblazers'],
    topics: ['spiritual', 'character'],
    personality: 'faith',
    moods: ['Grow closer to God'],
    hobbies: [],
    created_at: new Date().toISOString(),
  },
  {
    id: 'b3-short-history',
    title: 'A Short History of Nearly Everything',
    author: 'Bill Bryson',
    page_count: 544,
    description: 'A sweeping, readable tour of science and how we came to understand the world.',
    formats: { physical: { available: true, copies: 1 }, ebook: { available: false }, audiobook: { available: true } },
    age_bands: ['Builders', 'Trailblazers'],
    topics: ['science', 'history'],
    personality: 'bigpicture',
    moods: ['Learn something new'],
    hobbies: ['Science experiments', 'Outdoors'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'b4-wonder',
    title: 'Wonder',
    author: 'R.J. Palacio',
    page_count: 320,
    description: 'A boy with a facial difference starts school and changes how his classmates see kindness.',
    formats: { physical: { available: true, copies: 4 }, ebook: { available: true }, audiobook: { available: true } },
    age_bands: ['Explorers', 'Builders'],
    topics: ['understanding', 'character'],
    personality: 'story',
    moods: ['Understand myself better'],
    hobbies: ['Art', 'Music'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'b5-einstein',
    title: 'Who Was Albert Einstein?',
    author: 'Jess Brallier',
    page_count: 112,
    description: 'An accessible biography of the physicist, part of a well-known kids biography series.',
    formats: { physical: { available: true, copies: 5 }, ebook: { available: true }, audiobook: { available: false } },
    age_bands: ['Explorers'],
    topics: ['people', 'science'],
    personality: 'story',
    moods: ['Learn something new'],
    hobbies: ['Science experiments', 'Building/making things'],
    created_at: new Date().toISOString(),
  },
  {
    id: 'b6-story-of-the-world',
    title: 'The Story of the World',
    author: 'Susan Wise Bauer',
    page_count: 250,
    description: 'A narrative introduction to world history and cultures for younger readers.',
    formats: { physical: { available: true, copies: 2 }, ebook: { available: false }, audiobook: { available: true } },
    age_bands: ['Explorers', 'Builders'],
    topics: ['history', 'culture', 'worldtoday'],
    personality: 'bigpicture',
    moods: ['Understand the world better'],
    hobbies: ['Outdoors', 'Art'],
    created_at: new Date().toISOString(),
  },
];

const booksStore: BookRecord[] = [...INITIAL_BOOKS];
const registrationsStore: RegistrationRecord[] = [];
const sessionsStore: SessionRecord[] = [];

function makeSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

function hashAnswer(answer: string, salt: string): string {
  return crypto.createHash('sha256').update(salt + answer.trim().toLowerCase()).digest('hex');
}

function maskEmail(email: string): string {
  if (!email) return 'the email on file';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  return `${local.slice(0, 2)}${'*'.repeat(Math.max(local.length - 2, 2))}@${domain}`;
}

function checkAdminPassword(password: string): boolean {
  const configured = process.env.ADMIN_PASSWORD || 'admin';
  return Boolean(password && password === configured);
}

// ==========================================
// API Routes
// ==========================================

// Books list endpoint
app.get('/api/books', (req: Request, res: Response) => {
  const sorted = [...booksStore].sort((a, b) => a.title.localeCompare(b.title));
  res.json(sorted);
});

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', booksCount: booksStore.length });
});

// Netlify Functions Router
app.post('/.netlify/functions/:name', async (req: Request, res: Response) => {
  const { name } = req.params;
  const body = req.body || {};

  try {
    switch (name) {
      case 'admin-check': {
        const { password } = body;
        const valid = checkAdminPassword(password);
        return res.json({ valid });
      }

      case 'register': {
        const {
          firstName, age, ageBand, guardianEmail, personalEmail,
          username, securityQuestion, securityAnswer,
          formats, length, hobbies, topics, personality, mood, admired, skip,
        } = body;

        if (!firstName || !age || !ageBand || !guardianEmail || !username || !securityQuestion || !securityAnswer) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const existing = registrationsStore.find(
          r => r.username.toLowerCase() === username.trim().toLowerCase()
        );
        if (existing) {
          return res.status(409).json({ error: 'That username is already taken — try another' });
        }

        const salt = makeSalt();
        const hash = hashAnswer(securityAnswer, salt);

        const newMember: RegistrationRecord = {
          id: crypto.randomUUID(),
          first_name: firstName,
          age,
          age_band: ageBand,
          guardian_email: guardianEmail,
          personal_email: personalEmail || null,
          username,
          security_question: securityQuestion,
          security_answer_hash: hash,
          security_answer_salt: salt,
          formats: formats || [],
          length: length || '',
          hobbies: hobbies || [],
          topics: topics || [],
          personality: personality || '',
          mood: mood || '',
          admired: admired || null,
          skip_list: skip || null,
          created_at: new Date().toISOString(),
        };

        registrationsStore.push(newMember);
        return res.json({ success: true });
      }

      case 'login-lookup': {
        const { identifier } = body;
        if (!identifier) return res.status(400).json({ error: 'Missing identifier' });

        const idClean = identifier.trim().toLowerCase();
        const match = registrationsStore.find(
          r =>
            r.username.toLowerCase() === idClean ||
            (r.personal_email && r.personal_email.toLowerCase() === idClean) ||
            r.guardian_email.toLowerCase() === idClean
        );

        if (!match) return res.json({ found: false });

        return res.json({
          found: true,
          id: match.id,
          firstName: match.first_name,
          securityQuestion: match.security_question,
        });
      }

      case 'login-verify': {
        const { id, answer } = body;
        if (!id || !answer) return res.status(400).json({ error: 'Missing fields' });

        const member = registrationsStore.find(r => r.id === id);
        if (!member) return res.json({ success: false });

        const hash = hashAnswer(answer, member.security_answer_salt);
        if (hash !== member.security_answer_hash) {
          return res.json({ success: false });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        sessionsStore.push({
          id: crypto.randomUUID(),
          registration_id: member.id,
          token,
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
        });

        return res.json({
          success: true,
          token,
          firstName: member.first_name,
          ageBand: member.age_band,
          topics: member.topics,
          mood: member.mood,
          personality: member.personality,
          hobbies: member.hobbies,
          formats: member.formats,
          length: member.length,
          skip: member.skip_list,
        });
      }

      case 'session-check': {
        const { token } = body;
        if (!token) return res.json({ valid: false });

        const session = sessionsStore.find(s => s.token === token);
        if (!session || new Date(session.expires_at) < new Date()) {
          return res.json({ valid: false });
        }

        const member = registrationsStore.find(r => r.id === session.registration_id);
        if (!member) return res.json({ valid: false });

        return res.json({
          valid: true,
          token,
          firstName: member.first_name,
          ageBand: member.age_band,
          topics: member.topics,
          mood: member.mood,
          personality: member.personality,
          hobbies: member.hobbies,
          formats: member.formats,
          length: member.length,
          skip: member.skip_list,
        });
      }

      case 'logout': {
        const { token } = body;
        if (token) {
          const idx = sessionsStore.findIndex(s => s.token === token);
          if (idx !== -1) sessionsStore.splice(idx, 1);
        }
        return res.json({ success: true });
      }

      case 'forgot-identify': {
        const { identifier } = body;
        if (!identifier) return res.status(400).json({ error: 'Missing identifier' });

        const idClean = identifier.trim().toLowerCase();
        const member = registrationsStore.find(
          r =>
            r.username.toLowerCase() === idClean ||
            (r.personal_email && r.personal_email.toLowerCase() === idClean) ||
            r.guardian_email.toLowerCase() === idClean
        );

        if (!member) return res.json({ found: false });

        const code = String(Math.floor(100000 + Math.random() * 900000));
        member.reset_code = code;
        member.reset_code_expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        if (process.env.RESEND_API_KEY) {
          try {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                from: process.env.RESEND_FROM || 'Book Club <onboarding@resend.dev>',
                to: member.guardian_email,
                subject: 'Your book club login reset code',
                text: `Your reset code is ${code}. It expires in 10 minutes.`,
              }),
            });
            return res.json({ found: true, emailed: true, maskedEmail: maskEmail(member.guardian_email) });
          } catch (e) {
            console.error('Failed to send email:', e);
          }
        }

        return res.json({
          found: true,
          emailed: false,
          maskedEmail: maskEmail(member.guardian_email),
          devCode: code,
        });
      }

      case 'forgot-verify-code': {
        const { identifier, code } = body;
        if (!identifier || !code) return res.status(400).json({ error: 'Missing fields' });

        const idClean = identifier.trim().toLowerCase();
        const member = registrationsStore.find(
          r =>
            r.username.toLowerCase() === idClean ||
            (r.personal_email && r.personal_email.toLowerCase() === idClean) ||
            r.guardian_email.toLowerCase() === idClean
        );

        if (!member || !member.reset_code) return res.json({ verified: false });

        const expired = !member.reset_code_expires_at || new Date(member.reset_code_expires_at) < new Date();
        if (expired || member.reset_code !== String(code).trim()) {
          return res.json({ verified: false });
        }

        return res.json({ verified: true, id: member.id, username: member.username });
      }

      case 'forgot-reset': {
        const { id, newQuestion, newAnswer } = body;
        if (!id || !newQuestion || !newAnswer) return res.status(400).json({ error: 'Missing fields' });

        const member = registrationsStore.find(r => r.id === id);
        if (!member) return res.status(404).json({ error: 'Account not found' });

        const salt = makeSalt();
        const hash = hashAnswer(newAnswer, salt);
        member.security_question = newQuestion;
        member.security_answer_hash = hash;
        member.security_answer_salt = salt;
        member.reset_code = null;
        member.reset_code_expires_at = null;

        return res.json({ success: true });
      }

      case 'books-seed': {
        const { adminPassword, books } = body;
        if (!checkAdminPassword(adminPassword)) {
          return res.status(401).json({ error: 'Incorrect admin password' });
        }
        if (!Array.isArray(books) || books.length === 0) {
          return res.status(400).json({ error: 'No books provided' });
        }

        for (const b of books) {
          const newBook: BookRecord = {
            id: b.id || crypto.randomUUID(),
            title: b.title,
            author: b.author,
            page_count: b.page_count ?? null,
            description: b.description ?? null,
            formats: b.formats || {},
            age_bands: b.age_bands || [],
            topics: b.topics || [],
            personality: b.personality ?? null,
            moods: b.moods || [],
            hobbies: b.hobbies || [],
            ebook_file_name: b.ebook_file_name ?? null,
            ebook_file_size_kb: b.ebook_file_size_kb ?? null,
            ebook_file_path: b.ebook_file_path ?? null,
            audiobook_file_name: b.audiobook_file_name ?? null,
            audiobook_file_size_kb: b.audiobook_file_size_kb ?? null,
            audiobook_file_path: b.audiobook_file_path ?? null,
            created_at: new Date().toISOString(),
          };
          booksStore.push(newBook);
        }

        return res.json({ success: true });
      }

      case 'books-add': {
        const { adminPassword, book } = body;
        if (!checkAdminPassword(adminPassword)) {
          return res.status(401).json({ error: 'Incorrect admin password' });
        }
        if (!book || !book.title || !book.author) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const newBook: BookRecord = {
          id: crypto.randomUUID(),
          title: book.title,
          author: book.author,
          page_count: book.page_count ?? null,
          description: book.description ?? null,
          formats: book.formats || {},
          age_bands: book.age_bands || [],
          topics: book.topics || [],
          personality: book.personality ?? null,
          moods: book.moods || [],
          hobbies: book.hobbies || [],
          ebook_file_name: book.ebook_file_name ?? null,
          ebook_file_size_kb: book.ebook_file_size_kb ?? null,
          ebook_file_path: book.ebook_file_path ?? null,
          audiobook_file_name: book.audiobook_file_name ?? null,
          audiobook_file_size_kb: book.audiobook_file_size_kb ?? null,
          audiobook_file_path: book.audiobook_file_path ?? null,
          created_at: new Date().toISOString(),
        };

        booksStore.push(newBook);
        return res.json({ success: true, book: newBook });
      }

      case 'books-update': {
        const { adminPassword, id, book } = body;
        if (!checkAdminPassword(adminPassword)) {
          return res.status(401).json({ error: 'Incorrect admin password' });
        }
        if (!id || !book || !book.title || !book.author) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const idx = booksStore.findIndex(b => b.id === id);
        if (idx === -1) {
          return res.status(404).json({ error: 'Book not found' });
        }

        booksStore[idx] = {
          ...booksStore[idx],
          title: book.title,
          author: book.author,
          page_count: book.page_count ?? booksStore[idx].page_count,
          description: book.description ?? booksStore[idx].description,
          formats: book.formats ?? booksStore[idx].formats,
          age_bands: book.age_bands ?? booksStore[idx].age_bands,
          topics: book.topics ?? booksStore[idx].topics,
          personality: book.personality ?? booksStore[idx].personality,
          moods: book.moods ?? booksStore[idx].moods,
          hobbies: book.hobbies ?? booksStore[idx].hobbies,
          ebook_file_name: book.ebook_file_name ?? booksStore[idx].ebook_file_name,
          ebook_file_size_kb: book.ebook_file_size_kb ?? booksStore[idx].ebook_file_size_kb,
          ebook_file_path: book.ebook_file_path ?? booksStore[idx].ebook_file_path,
          audiobook_file_name: book.audiobook_file_name ?? booksStore[idx].audiobook_file_name,
          audiobook_file_size_kb: book.audiobook_file_size_kb ?? booksStore[idx].audiobook_file_size_kb,
          audiobook_file_path: book.audiobook_file_path ?? booksStore[idx].audiobook_file_path,
        };

        return res.json({ success: true });
      }

      case 'get-file-url': {
        const { token, bookId, fileType } = body;
        if (!token || !bookId || !['ebook', 'audiobook'].includes(fileType)) {
          return res.status(400).json({ error: 'Missing or invalid fields' });
        }

        const session = sessionsStore.find(s => s.token === token);
        if (!session || new Date(session.expires_at) < new Date()) {
          return res.status(401).json({ error: 'Please log in again.' });
        }

        const book = booksStore.find(b => b.id === bookId);
        if (!book) return res.status(404).json({ error: 'Book not found' });

        const titleEncoded = encodeURIComponent(book.title);
        const sampleUrl = `data:text/plain;charset=utf-8,Book%20File%20Preview%20for%20${titleEncoded}%20(${fileType})`;
        return res.json({ url: sampleUrl });
      }

      case 'storage-sign-upload': {
        const { adminPassword, fileName } = body;
        if (!checkAdminPassword(adminPassword)) {
          return res.status(401).json({ error: 'Incorrect admin password' });
        }
        if (!fileName) return res.status(400).json({ error: 'Missing file name' });

        const safeName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const pathStr = `${Date.now()}-${safeName}`;
        return res.json({ path: pathStr, token: 'mock-upload-token' });
      }

      default:
        return res.status(404).json({ error: `Function ${name} not found` });
    }
  } catch (err: any) {
    console.error(`Error in function ${name}:`, err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ==========================================
// Vite / Static Serving
// ==========================================

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd && fs.existsSync(path.resolve('vite.config.js'))) {
    // Dynamic import vite for dev mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Visual Genius Book Club] Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
