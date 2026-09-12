import { useState, useEffect, Fragment } from 'react';
import { Check, Compass, Hammer, Flag, ArrowLeft, Search, BookOpen } from 'lucide-react';
import { supabase } from './supabaseClient';

const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

const DOMAIN_TYPO_FIXES = {
  'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.om': 'gmail.com',
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gnail.com': 'gmail.com',
  'yahoo.co': 'yahoo.com', 'yaho.com': 'yahoo.com', 'yahho.com': 'yahoo.com', 'yaoo.com': 'yahoo.com',
  'hotmail.co': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'hotmil.com': 'hotmail.com', 'hotmai.com': 'hotmail.com',
  'outlook.co': 'outlook.com', 'outlok.com': 'outlook.com', 'outllok.com': 'outlook.com',
  'icloud.co': 'icloud.com', 'iclod.com': 'icloud.com', 'iclould.com': 'icloud.com',
};

function domainSuggestion(email) {
  const at = email.lastIndexOf('@');
  if (at === -1) return null;
  const domain = email.slice(at + 1).toLowerCase();
  return DOMAIN_TYPO_FIXES[domain] || null;
}

async function callFunction(name, payload) {
  const res = await fetch(`/.netlify/functions/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const STEPS = [
  { n: 1, label: 'Basics' },
  { n: 2, label: 'Account security' },
  { n: 3, label: 'Reading setup' },
  { n: 4, label: 'Growth & style' },
  { n: 5, label: 'Review' },
];

const TOPICS = [
  { id: 'growth', label: 'Personal growth & habits', blurb: 'Mindset, discipline, goal-setting' },
  { id: 'character', label: 'Character & meaning', blurb: 'Values, purpose, mindfulness' },
  { id: 'spiritual', label: 'Spiritual Growth', blurb: 'Knowing God, the Holy Spirit, becoming like Jesus' },
  { id: 'history', label: 'History & civilizations', blurb: 'Eras, turning points, empires' },
  { id: 'worldtoday', label: 'The world today', blurb: 'Geography, current events, how things work' },
  { id: 'science', label: 'Science & how things work', blurb: 'Space, nature, technology' },
  { id: 'people', label: 'People who shaped history', blurb: 'Biographies, changemakers' },
  { id: 'money', label: 'Money & practical life skills', blurb: 'Financial literacy, real-world skills' },
  { id: 'understanding', label: 'Understanding people', blurb: 'Psychology, emotions, communication' },
  { id: 'culture', label: 'Culture & traditions', blurb: 'Customs, philosophies, ways of living' },
];
const TOPIC_LABELS = Object.fromEntries(TOPICS.map(t => [t.id, t.label]));

const HOBBIES_BASE = ['Sports', 'Art', 'Gaming', 'Music', 'Animals', 'Building/making things', 'Outdoors', 'Volunteering', 'Science experiments', 'Writing'];
const HOBBIES_TRAILBLAZER_EXTRA = ['Debate', 'Entrepreneurship', 'Social media/content'];

const PERSONALITY = [
  { id: 'practical', label: 'The Practical One', blurb: 'Wants tips to use today' },
  { id: 'bigpicture', label: 'The Big-Picture Thinker', blurb: 'Wants context and connections' },
  { id: 'story', label: 'The Story Lover', blurb: 'Wants biography and real stories' },
  { id: 'deep', label: 'The Deep Thinker', blurb: 'Wants reflection and big questions' },
  { id: 'faith', label: 'The Faith Seeker', blurb: 'Wants a deeper walk with God' },
];

const MOODS = ['Learn something new', 'Get inspired', 'Understand myself better', 'Understand the world better', 'Build a skill or habit', 'Grow closer to God'];
const FORMATS = ['Physical', 'E-book', 'Audiobook', 'No preference'];
const LENGTHS = ['Short & quick', 'Medium', 'Long', 'No preference'];

const SECURITY_QUESTIONS = [
  "What's your favorite animal?",
  "What was your first pet's name?",
  "What's your favorite book or movie?",
  "What city were you born in?",
  "What's your favorite food?",
  'Write my own question',
];

const PAGE_RANGES = {
  Explorers: { 'Short & quick': 'Under 100 pages', Medium: '100–200 pages', Long: '200+ pages', 'No preference': '' },
  Builders: { 'Short & quick': 'Under 150 pages', Medium: '150–300 pages', Long: '300+ pages', 'No preference': '' },
  Trailblazers: { 'Short & quick': 'Under 200 pages', Medium: '200–350 pages', Long: '350+ pages', 'No preference': '' },
};

const AGE_BANDS = ['Explorers', 'Builders', 'Trailblazers'];
const BAND_ICON = { Explorers: Compass, Builders: Hammer, Trailblazers: Flag };

const initialData = {
  firstName: '', age: '', guardianEmail: '', personalEmail: '',
  username: '', securityQuestion: '', securityQuestionCustom: '', securityAnswer: '', securityAnswerConfirm: '',
  formats: [], length: '', hobbies: [], topics: [],
  personality: '', mood: '', admired: '', skip: '',
};

function getAgeBand(age) {
  if (age >= 8 && age <= 11) return 'Explorers';
  if (age >= 12 && age <= 15) return 'Builders';
  if (age >= 16 && age <= 20) return 'Trailblazers';
  return null;
}

const CATALOGUE_FORMATS = [
  { key: 'physical', label: 'Physical' },
  { key: 'ebook', label: 'E-book' },
  { key: 'audiobook', label: 'Audiobook' },
];

const emptyFormats = { physical: { available: false, copies: 1 }, ebook: { available: false }, audiobook: { available: false } };

const initialBook = {
  title: '', author: '', pageCount: '', description: '',
  formats: emptyFormats, ageBands: [], topics: [], personality: '', moods: [], hobbies: [],
  ebookFile: null, audiobookFile: null,
};

const SAMPLE_BOOKS = [
  {
    title: 'The Compound Effect', author: 'Darren Hardy', pageCount: 208,
    description: 'Small, consistent choices compound into big results over time.',
    formats: { physical: { available: true, copies: 3 }, ebook: { available: true }, audiobook: { available: false } },
    ageBands: ['Builders', 'Trailblazers'], topics: ['growth'], personality: 'practical', moods: ['Build a skill or habit'],
    hobbies: ['Sports', 'Entrepreneurship'],
  },
  {
    title: 'Mere Christianity', author: 'C.S. Lewis', pageCount: 256,
    description: 'A classic case for Christian belief and what it means to follow Jesus.',
    formats: { physical: { available: true, copies: 2 }, ebook: { available: true }, audiobook: { available: true } },
    ageBands: ['Trailblazers'], topics: ['spiritual', 'character'], personality: 'faith', moods: ['Grow closer to God'],
    hobbies: [],
  },
  {
    title: 'A Short History of Nearly Everything', author: 'Bill Bryson', pageCount: 544,
    description: 'A sweeping, readable tour of science and how we came to understand the world.',
    formats: { physical: { available: true, copies: 1 }, ebook: { available: false }, audiobook: { available: true } },
    ageBands: ['Builders', 'Trailblazers'], topics: ['science', 'history'], personality: 'bigpicture', moods: ['Learn something new'],
    hobbies: ['Science experiments', 'Outdoors'],
  },
  {
    title: 'Wonder', author: 'R.J. Palacio', pageCount: 320,
    description: 'A boy with a facial difference starts school and changes how his classmates see kindness.',
    formats: { physical: { available: true, copies: 4 }, ebook: { available: true }, audiobook: { available: true } },
    ageBands: ['Explorers', 'Builders'], topics: ['understanding', 'character'], personality: 'story', moods: ['Understand myself better'],
    hobbies: ['Art', 'Music'],
  },
  {
    title: 'Who Was Albert Einstein?', author: 'Jess Brallier', pageCount: 112,
    description: 'An accessible biography of the physicist, part of a well-known kids biography series.',
    formats: { physical: { available: true, copies: 5 }, ebook: { available: true }, audiobook: { available: false } },
    ageBands: ['Explorers'], topics: ['people', 'science'], personality: 'story', moods: ['Learn something new'],
    hobbies: ['Science experiments', 'Building/making things'],
  },
  {
    title: 'The Story of the World', author: 'Susan Wise Bauer', pageCount: 250,
    description: 'A narrative introduction to world history and cultures for younger readers.',
    formats: { physical: { available: true, copies: 2 }, ebook: { available: false }, audiobook: { available: true } },
    ageBands: ['Explorers', 'Builders'], topics: ['history', 'culture', 'worldtoday'], personality: 'bigpicture', moods: ['Understand the world better'],
    hobbies: ['Outdoors', 'Art'],
  },
];

function toDbBook(book) {
  return {
    title: book.title,
    author: book.author,
    page_count: book.pageCount ? parseInt(book.pageCount, 10) : null,
    description: book.description || null,
    formats: book.formats,
    age_bands: book.ageBands,
    topics: book.topics,
    personality: book.personality || null,
    moods: book.moods || [],
    hobbies: book.hobbies || [],
    ebook_file_name: book.ebookFile?.name || null,
    ebook_file_size_kb: book.ebookFile?.sizeKB || null,
    ebook_file_path: book.ebookFile?.path || null,
    audiobook_file_name: book.audiobookFile?.name || null,
    audiobook_file_size_kb: book.audiobookFile?.sizeKB || null,
    audiobook_file_path: book.audiobookFile?.path || null,
  };
}

function fromDbBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    pageCount: row.page_count,
    description: row.description,
    formats: row.formats,
    ageBands: row.age_bands || [],
    topics: row.topics || [],
    personality: row.personality,
    moods: row.moods || [],
    hobbies: row.hobbies || [],
    ebookFile: row.ebook_file_name ? { name: row.ebook_file_name, sizeKB: row.ebook_file_size_kb, path: row.ebook_file_path } : null,
    audiobookFile: row.audiobook_file_name
      ? { name: row.audiobook_file_name, sizeKB: row.audiobook_file_size_kb, path: row.audiobook_file_path }
      : null,
  };
}

// --- Recommendation engine ---------------------------------------------
// Hard filters narrow the pool first (age, format, length, skip list),
// then the remaining books are weighted: topics 45%, personality 25%,
// hobbies 15%, mood 15% — same weights defined back in the original spec.

const LENGTH_BOUNDS = {
  Explorers: { 'Short & quick': [0, 99], Medium: [100, 200], Long: [201, Infinity] },
  Builders: { 'Short & quick': [0, 149], Medium: [150, 300], Long: [301, Infinity] },
  Trailblazers: { 'Short & quick': [0, 199], Medium: [200, 350], Long: [351, Infinity] },
};

const REGISTRANT_FORMAT_TO_BOOK_KEY = { Physical: 'physical', 'E-book': 'ebook', Audiobook: 'audiobook' };

function passesHardFilters(profile, book) {
  if (!(book.ageBands || []).includes(profile.ageBand)) return false;

  const formats = profile.formats || [];
  if (!formats.includes('No preference')) {
    const anyFormatMatches = formats.some(f => {
      const key = REGISTRANT_FORMAT_TO_BOOK_KEY[f];
      return key && book.formats?.[key]?.available;
    });
    if (!anyFormatMatches) return false;
  }

  if (profile.length && profile.length !== 'No preference' && book.pageCount) {
    const bounds = LENGTH_BOUNDS[profile.ageBand]?.[profile.length];
    if (bounds && (book.pageCount < bounds[0] || book.pageCount > bounds[1])) return false;
  }

  if (profile.skip && profile.skip.trim()) {
    const skipWords = profile.skip.toLowerCase().split(/[,;]+/).map(s => s.trim()).filter(Boolean);
    const haystack = `${book.title} ${book.description || ''} ${(book.topics || []).map(id => TOPIC_LABELS[id] || '').join(' ')}`.toLowerCase();
    if (skipWords.some(w => haystack.includes(w))) return false;
  }

  return true;
}

function scoreBook(profile, book) {
  let score = 0;

  const matchingTopics = (profile.topics || []).filter(t => (book.topics || []).includes(t)).length;
  score += (matchingTopics / 3) * 0.45;

  if (!book.personality) score += 0.5 * 0.25;
  else if (book.personality === profile.personality) score += 0.25;

  const bookHobbies = book.hobbies || [];
  if (bookHobbies.length === 0) {
    score += 0.5 * 0.15;
  } else {
    const matchingHobbies = (profile.hobbies || []).filter(h => bookHobbies.includes(h)).length;
    score += Math.min(matchingHobbies / 2, 1) * 0.15;
  }

  const bookMoods = book.moods || [];
  if (bookMoods.length === 0) score += 0.5 * 0.15;
  else if (bookMoods.includes(profile.mood)) score += 0.15;

  return score;
}

function computeRecommendations(profile, books, limit = 6) {
  if (!profile) return [];
  return books
    .filter(b => passesHardFilters(profile, b))
    .map(b => ({ book: b, score: scoreBook(profile, b) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function Field({ label, error, children }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

function Pill({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-full border text-sm transition-colors ${
        selected ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-stone-300 text-stone-700 hover:border-amber-400'
      }`}
    >
      {children}
    </button>
  );
}

function ReviewRow({ label, value, onEdit }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <dt className="text-stone-400 text-xs">{label}</dt>
        <dd className="text-stone-800">{value}</dd>
      </div>
      <button type="button" onClick={onEdit} className="text-xs text-amber-700 hover:text-amber-800 shrink-0 mt-3.5">
        Edit
      </button>
    </div>
  );
}

function BandBadge({ band }) {
  const Icon = BAND_ICON[band];
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
      {Icon && <Icon size={11} />}
      {band}
    </span>
  );
}

function AdminGate({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function handleUnlock() {
    setError('');
    setChecking(true);
    try {
      const result = await callFunction('admin-check', { password });
      if (result.valid) onUnlock(password);
      else setError('Incorrect password');
    } catch {
      setError('Something went wrong — please try again.');
    }
    setChecking(false);
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-6">
      <h2 className="text-lg font-medium text-stone-900 mb-1">Admin access required</h2>
      <p className="text-sm text-stone-500 mb-4">Adding books is limited to club admins.</p>
      <Field label="Admin password" error={error}>
        <input
          type="password"
          value={password}
          onChange={e => {
            setPassword(e.target.value);
            setError('');
          }}
          onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
      </Field>
      <button
        type="button"
        onClick={handleUnlock}
        disabled={checking}
        className="w-full px-5 py-2 rounded-md bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-60"
      >
        {checking ? 'Checking…' : 'Unlock'}
      </button>
    </div>
  );
}

function RegisterFlow() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const ageNum = parseInt(data.age, 10);
  const ageBand = getAgeBand(ageNum);
  const hobbyOptions = ageBand === 'Trailblazers' ? [...HOBBIES_BASE, ...HOBBIES_TRAILBLAZER_EXTRA] : HOBBIES_BASE;

  function set(field, value) {
    setData(d => ({ ...d, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  }

  function toggleHobby(h) {
    setData(d => (d.hobbies.includes(h) ? { ...d, hobbies: d.hobbies.filter(x => x !== h) } : { ...d, hobbies: [...d.hobbies, h] }));
  }

  function toggleFormat(f) {
    setData(d => {
      if (f === 'No preference') {
        return { ...d, formats: d.formats.includes('No preference') ? [] : ['No preference'] };
      }
      const withoutNoPref = d.formats.filter(x => x !== 'No preference');
      return { ...d, formats: withoutNoPref.includes(f) ? withoutNoPref.filter(x => x !== f) : [...withoutNoPref, f] };
    });
    setErrors(e => ({ ...e, format: undefined }));
  }

  function toggleTopic(id) {
    setData(d => {
      if (d.topics.includes(id)) return { ...d, topics: d.topics.filter(t => t !== id) };
      if (d.topics.length >= 3) return d;
      return { ...d, topics: [...d.topics, id] };
    });
    setErrors(e => ({ ...e, topics: undefined }));
  }

  function validateStep(n) {
    const e = {};
    if (n === 1) {
      if (!data.firstName.trim()) e.firstName = 'Enter a first name';
      if (!data.age || isNaN(ageNum) || ageNum < 8 || ageNum > 20) e.age = 'Age must be between 8 and 20';
      const guardian = data.guardianEmail.trim();
      const personal = data.personalEmail.trim();
      if (!guardian || !EMAIL_RE.test(guardian)) {
        e.guardianEmail = 'Enter a valid, complete email';
      } else {
        const fix = domainSuggestion(guardian);
        if (fix) e.guardianEmail = `Looks like a typo — did you mean "${guardian.slice(0, guardian.lastIndexOf('@') + 1)}${fix}"?`;
      }
      if (personal) {
        if (!EMAIL_RE.test(personal)) {
          e.personalEmail = 'Enter a valid email, or leave this blank';
        } else {
          const fix = domainSuggestion(personal);
          if (fix) e.personalEmail = `Looks like a typo — did you mean "${personal.slice(0, personal.lastIndexOf('@') + 1)}${fix}"?`;
          else if (!e.guardianEmail && personal.toLowerCase() === guardian.toLowerCase()) {
            e.personalEmail = "This matches the parent/guardian/mentor email — enter a different one, or leave this blank";
          }
        }
      }
    }
    if (n === 2) {
      const uname = data.username.trim();
      if (!uname) e.username = 'Choose a username';
      else if (!/^[a-zA-Z0-9_]{3,20}$/.test(uname)) e.username = '3–20 letters, numbers, or underscores';
      if (!data.securityQuestion) e.securityQuestion = 'Choose a question';
      else if (data.securityQuestion === 'Write my own question' && !data.securityQuestionCustom.trim()) {
        e.securityQuestionCustom = 'Write your question';
      }
      if (!data.securityAnswer.trim()) e.securityAnswer = 'Enter an answer';
      else if (data.securityAnswer.trim().length < 2) e.securityAnswer = 'Answer is too short';
      if (data.securityAnswerConfirm.trim().toLowerCase() !== data.securityAnswer.trim().toLowerCase()) {
        e.securityAnswerConfirm = "Answers don't match";
      }
    }
    if (n === 3) {
      if (!data.formats.length) e.format = 'Choose at least one format';
      if (!data.length) e.length = 'Choose a length';
    }
    if (n === 4) {
      if (data.topics.length !== 3) e.topics = 'Choose exactly 3';
      if (!data.personality) e.personality = 'Pick one';
      if (!data.mood) e.mood = 'Pick one';
    }
    setErrors(prev => ({ ...prev, ...e, ...Object.fromEntries(Object.keys(prev).filter(k => !(k in e)).map(k => [k, undefined])) }));
    return Object.keys(e).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep(s => Math.min(5, s + 1));
  }
  function back() {
    setStep(s => Math.max(1, s - 1));
  }

  async function submit() {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) return;
    setSubmitting(true);
    try {
      const questionText = data.securityQuestion === 'Write my own question' ? data.securityQuestionCustom.trim() : data.securityQuestion;
      await callFunction('register', {
        firstName: data.firstName,
        age: ageNum,
        ageBand,
        guardianEmail: data.guardianEmail.trim(),
        personalEmail: data.personalEmail.trim() || null,
        username: data.username.trim(),
        securityQuestion: questionText,
        securityAnswer: data.securityAnswer,
        formats: data.formats,
        length: data.length,
        hobbies: data.hobbies,
        topics: data.topics,
        personality: data.personality,
        mood: data.mood,
        admired: data.admired || null,
        skip: data.skip || null,
      });
      setSubmitted(true);
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('username')) {
        setErrors(e => ({ ...e, username: err.message }));
        setStep(2);
      } else {
        setErrors(e => ({ ...e, submit: err.message || "Couldn't save that just now — please try again." }));
      }
    }
    setSubmitting(false);
  }

  function resetForm() {
    setData(initialData);
    setErrors({});
    setStep(1);
    setSubmitted(false);
  }

  const BandIcon = ageBand ? BAND_ICON[ageBand] : null;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-stone-900">Join the book club</h1>
        <p className="text-sm text-stone-500 mt-1">A few questions so we can point you to books worth your time.</p>
      </div>

      {!submitted && (
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <Fragment key={s.n}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step > s.n
                      ? 'bg-amber-600 text-white'
                      : step === s.n
                      ? 'bg-amber-100 text-amber-800 border-2 border-amber-600'
                      : 'bg-stone-100 text-stone-400 border border-stone-300'
                  }`}
                >
                  {step > s.n ? <Check size={16} /> : s.n}
                </div>
                <span className={`text-xs text-center ${step >= s.n ? 'text-stone-700' : 'text-stone-400'}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-1 ${step > s.n ? 'bg-amber-600' : 'bg-stone-300'}`} />}
            </Fragment>
          ))}
        </div>
      )}

      {submitted ? (
        <div className="bg-white border border-stone-200 rounded-lg p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
            <Check size={24} />
          </div>
          <h2 className="text-lg font-medium text-stone-900">You're registered, {data.firstName}!</h2>
          <p className="text-sm text-stone-500 mt-1">
            Placed in <span className="font-medium text-stone-700">{ageBand}</span>. Your picks will be ready once recommendations are wired up.
          </p>
          <p className="text-xs text-stone-400 mt-3">
            Save your username — <span className="font-medium text-stone-600">{data.username}</span> — you'll need it (or your email) plus your security answer to log in.
          </p>
          <button type="button" onClick={resetForm} className="mt-5 px-4 py-2 rounded-md bg-stone-800 text-white text-sm hover:bg-stone-700">
            Register another person
          </button>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg p-6">
          {step === 1 && (
            <div>
              <Field label="First name" error={errors.firstName}>
                <input
                  type="text"
                  value={data.firstName}
                  onChange={e => set('firstName', e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="What should we call you?"
                />
              </Field>

              <Field label="Age" error={errors.age}>
                <input
                  type="number"
                  min={8}
                  max={20}
                  value={data.age}
                  onChange={e => set('age', e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="8–20"
                />
                {ageBand && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                    {BandIcon && <BandIcon size={13} />}
                    {ageBand}
                  </div>
                )}
              </Field>

              <Field label="Parent, guardian, or mentor email" error={errors.guardianEmail}>
                <input
                  type="email"
                  value={data.guardianEmail}
                  onChange={e => set('guardianEmail', e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="parent@example.com"
                />
              </Field>

              <Field label="Your own email (optional)" error={errors.personalEmail}>
                <input
                  type="email"
                  value={data.personalEmail}
                  onChange={e => set('personalEmail', e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="Only if you check your own inbox"
                />
                <p className="text-xs text-stone-400 mt-1">We'll always keep your parent, guardian, or mentor in the loop too.</p>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div>
              <Field label="Choose a username" error={errors.username}>
                <input
                  type="text"
                  value={data.username}
                  onChange={e => set('username', e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  placeholder="e.g. mike_reads"
                />
                <p className="text-xs text-stone-400 mt-1">You'll use this (or your email) to log in later.</p>
              </Field>

              <Field label="Pick a security question" error={errors.securityQuestion}>
                <div className="grid gap-2">
                  {SECURITY_QUESTIONS.map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => set('securityQuestion', q)}
                      className={`w-full text-left rounded-lg border px-4 py-2.5 text-sm ${
                        data.securityQuestion === q ? 'border-amber-600 bg-amber-50 text-stone-800' : 'border-stone-300 text-stone-700 hover:border-amber-400'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </Field>

              {data.securityQuestion === 'Write my own question' && (
                <Field label="Your question" error={errors.securityQuestionCustom}>
                  <input
                    type="text"
                    value={data.securityQuestionCustom}
                    onChange={e => set('securityQuestionCustom', e.target.value)}
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </Field>
              )}

              <Field label="Your answer" error={errors.securityAnswer}>
                <input
                  type="text"
                  value={data.securityAnswer}
                  onChange={e => set('securityAnswer', e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </Field>

              <Field label="Type your answer again" error={errors.securityAnswerConfirm}>
                <input
                  type="text"
                  value={data.securityAnswerConfirm}
                  onChange={e => set('securityAnswerConfirm', e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                <p className="text-xs text-stone-400 mt-1">Answers aren't case-sensitive, so don't worry about capitalization.</p>
              </Field>
            </div>
          )}

          {step === 3 && (
            <div>
              <Field label="Which formats work for you? (pick all that apply)" error={errors.format}>
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map(f => (
                    <Pill key={f} selected={data.formats.includes(f)} onClick={() => toggleFormat(f)}>
                      {f}
                    </Pill>
                  ))}
                </div>
              </Field>

              <Field label="Book length" error={errors.length}>
                <div className="flex flex-col gap-2">
                  {LENGTHS.map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => set('length', l)}
                      className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left ${
                        data.length === l ? 'border-amber-600 bg-amber-50' : 'border-stone-300 hover:border-amber-400'
                      }`}
                    >
                      <span className="text-sm font-medium text-stone-800">{l}</span>
                      {ageBand && <span className="text-xs text-stone-500">{PAGE_RANGES[ageBand][l]}</span>}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Your hobbies (pick as many as you like)">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {hobbyOptions.map(h => (
                    <Pill key={h} selected={data.hobbies.includes(h)} onClick={() => toggleHobby(h)}>
                      {h}
                    </Pill>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {step === 4 && (
            <div>
              <Field label={`Top 3 things you want to grow in (${data.topics.length}/3)`} error={errors.topics}>
                <div className="grid gap-2">
                  {TOPICS.map(t => {
                    const idx = data.topics.indexOf(t.id);
                    const selected = idx > -1;
                    const disabled = !selected && data.topics.length >= 3;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleTopic(t.id)}
                        className={`relative text-left rounded-lg border px-4 py-3 ${
                          selected ? 'border-amber-600 bg-amber-50' : 'border-stone-300 hover:border-amber-400'
                        } ${disabled ? 'opacity-50' : ''}`}
                      >
                        <p className="text-sm font-medium text-stone-800 pr-6">{t.label}</p>
                        <p className="text-xs text-stone-500 mt-0.5">{t.blurb}</p>
                        {selected && (
                          <span className="absolute top-2.5 right-3 w-5 h-5 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center">
                            {idx + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="Which one sounds most like you?" error={errors.personality}>
                <div className="grid gap-2">
                  {PERSONALITY.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => set('personality', p.id)}
                      className={`text-left rounded-lg border px-4 py-3 ${
                        data.personality === p.id ? 'border-amber-600 bg-amber-50' : 'border-stone-300 hover:border-amber-400'
                      }`}
                    >
                      <p className="text-sm font-medium text-stone-800">{p.label}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{p.blurb}</p>
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="What are you looking for right now?" error={errors.mood}>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map(m => (
                    <Pill key={m} selected={data.mood === m} onClick={() => set('mood', m)}>
                      {m}
                    </Pill>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {step === 5 && (
            <div>
              <Field label="A book, show, or person you admire (optional)">
                <input
                  type="text"
                  value={data.admired}
                  onChange={e => set('admired', e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </Field>

              <Field label="Anything you'd rather skip (optional)">
                <input
                  type="text"
                  value={data.skip}
                  onChange={e => set('skip', e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </Field>

              <div className="mt-6 border-t border-stone-200 pt-4">
                <h3 className="text-sm font-medium text-stone-700 mb-3">Review</h3>
                <dl className="text-sm space-y-2">
                  <ReviewRow label="Name" value={data.firstName} onEdit={() => setStep(1)} />
                  <ReviewRow label="Age" value={`${data.age} (${ageBand || '—'})`} onEdit={() => setStep(1)} />
                  <ReviewRow label="Parent/guardian/mentor email" value={data.guardianEmail} onEdit={() => setStep(1)} />
                  <ReviewRow label="Username" value={data.username} onEdit={() => setStep(2)} />
                  <ReviewRow
                    label="Security question"
                    value={data.securityQuestion === 'Write my own question' ? data.securityQuestionCustom : data.securityQuestion}
                    onEdit={() => setStep(2)}
                  />
                  <ReviewRow label="Format" value={data.formats.join(', ') || '—'} onEdit={() => setStep(3)} />
                  <ReviewRow label="Length" value={data.length} onEdit={() => setStep(3)} />
                  <ReviewRow label="Hobbies" value={data.hobbies.join(', ') || '—'} onEdit={() => setStep(3)} />
                  <ReviewRow label="Top 3 topics" value={data.topics.map(id => TOPIC_LABELS[id]).join(' → ') || '—'} onEdit={() => setStep(4)} />
                  <ReviewRow label="Style" value={PERSONALITY.find(p => p.id === data.personality)?.label || '—'} onEdit={() => setStep(4)} />
                  <ReviewRow label="Looking for" value={data.mood || '—'} onEdit={() => setStep(4)} />
                </dl>
              </div>

              {errors.submit && <p className="text-xs text-rose-600 mt-3">{errors.submit}</p>}
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-stone-200">
            <button type="button" onClick={back} disabled={step === 1} className="px-4 py-2 text-sm text-stone-600 disabled:opacity-0">
              Back
            </button>
            {step < 5 ? (
              <button type="button" onClick={next} className="px-5 py-2 rounded-md bg-amber-600 text-white text-sm hover:bg-amber-700">
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="px-5 py-2 rounded-md bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-60"
              >
                {submitting ? 'Saving…' : 'Submit registration'}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function LoginFlow({ onGoToCatalogue, onLoginSuccess, onLogout }) {
  const [view, setView] = useState('form');

  const [identifier, setIdentifier] = useState('');
  const [phase, setPhase] = useState('identify');
  const [foundId, setFoundId] = useState(null);
  const [foundName, setFoundName] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [profile, setProfile] = useState(null);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [fIdentifier, setFIdentifier] = useState('');
  const [fPhase, setFPhase] = useState('identify');
  const [fMaskedEmail, setFMaskedEmail] = useState('');
  const [fDevCode, setFDevCode] = useState('');
  const [fEmailed, setFEmailed] = useState(false);
  const [fCodeInput, setFCodeInput] = useState('');
  const [fVerifiedId, setFVerifiedId] = useState(null);
  const [fUsername, setFUsername] = useState('');
  const [fNewQuestion, setFNewQuestion] = useState('');
  const [fNewQuestionCustom, setFNewQuestionCustom] = useState('');
  const [fNewAnswer, setFNewAnswer] = useState('');
  const [fNewAnswerConfirm, setFNewAnswerConfirm] = useState('');
  const [fError, setFError] = useState('');
  const [fLoading, setFLoading] = useState(false);

  async function handleIdentify() {
    setError('');
    setLoading(true);
    try {
      const result = await callFunction('login-lookup', { identifier });
      if (!result.found) setError("We couldn't find an account with that username or email.");
      else {
        setFoundId(result.id);
        setFoundName(result.firstName);
        setSecurityQuestion(result.securityQuestion);
        setPhase('answer');
      }
    } catch {
      setError('Something went wrong — please try again.');
    }
    setLoading(false);
  }

  async function handleAnswer() {
    setError('');
    if (!answer.trim()) {
      setError('Enter an answer');
      return;
    }
    setLoading(true);
    try {
      const result = await callFunction('login-verify', { id: foundId, answer });
      if (result.success) {
        setProfile(result);
        onLoginSuccess && onLoginSuccess(result.token, result);
        setPhase('success');
      } else {
        setError("That doesn't match. Try again, or reset your login below.");
      }
    } catch {
      setError('Something went wrong — please try again.');
    }
    setLoading(false);
  }

  async function resetLogin() {
    if (profile?.token) {
      try {
        await callFunction('logout', { token: profile.token });
      } catch {
        // logging out should never visibly fail for the user
      }
    }
    onLogout && onLogout();
    setIdentifier('');
    setPhase('identify');
    setFoundId(null);
    setFoundName('');
    setSecurityQuestion('');
    setProfile(null);
    setAnswer('');
    setError('');
  }

  function resetForgot() {
    setFIdentifier('');
    setFPhase('identify');
    setFMaskedEmail('');
    setFDevCode('');
    setFEmailed(false);
    setFCodeInput('');
    setFVerifiedId(null);
    setFUsername('');
    setFNewQuestion('');
    setFNewQuestionCustom('');
    setFNewAnswer('');
    setFNewAnswerConfirm('');
    setFError('');
  }

  function switchToForgot() {
    resetForgot();
    setFIdentifier(identifier);
    setView('forgot');
  }
  function switchToLogin() {
    resetLogin();
    setView('form');
  }

  async function handleForgotIdentify() {
    setFError('');
    setFLoading(true);
    try {
      const result = await callFunction('forgot-identify', { identifier: fIdentifier });
      if (!result.found) {
        setFError("We couldn't find an account with that username or email.");
        setFLoading(false);
        return;
      }
      setFMaskedEmail(result.maskedEmail);
      setFEmailed(result.emailed);
      setFDevCode(result.devCode || '');
      setFPhase('code');
    } catch {
      setFError('Something went wrong — please try again.');
    }
    setFLoading(false);
  }

  async function handleVerifyCode() {
    setFError('');
    setFLoading(true);
    try {
      const result = await callFunction('forgot-verify-code', { identifier: fIdentifier, code: fCodeInput });
      if (!result.verified) {
        setFError("That code doesn't match.");
      } else {
        setFVerifiedId(result.id);
        setFUsername(result.username);
        setFPhase('reset');
      }
    } catch {
      setFError('Something went wrong — please try again.');
    }
    setFLoading(false);
  }

  async function handleSaveNewSecurity() {
    setFError('');
    if (!fNewQuestion) {
      setFError('Choose a question');
      return;
    }
    const questionText = fNewQuestion === 'Write my own question' ? fNewQuestionCustom.trim() : fNewQuestion;
    if (fNewQuestion === 'Write my own question' && !questionText) {
      setFError('Write your question');
      return;
    }
    if (!fNewAnswer.trim()) {
      setFError('Enter an answer');
      return;
    }
    if (fNewAnswer.trim().toLowerCase() !== fNewAnswerConfirm.trim().toLowerCase()) {
      setFError("Answers don't match");
      return;
    }
    setFLoading(true);
    try {
      await callFunction('forgot-reset', { id: fVerifiedId, newQuestion: questionText, newAnswer: fNewAnswer });
      setFPhase('done');
    } catch {
      setFError("Couldn't save that just now — try again.");
    }
    setFLoading(false);
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-6">
      {view === 'form' ? (
        <div>
          <h2 className="text-lg font-medium text-stone-900 mb-1">Log in</h2>
          <p className="text-sm text-stone-500 mb-4">Use your username or email, then answer your security question.</p>

          {phase === 'identify' && (
            <div>
              <Field label="Username or email" error={error}>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => {
                    setIdentifier(e.target.value);
                    setError('');
                  }}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </Field>
              <button
                type="button"
                onClick={handleIdentify}
                disabled={loading}
                className="w-full px-5 py-2 rounded-md bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-60"
              >
                {loading ? 'Checking…' : 'Continue'}
              </button>
            </div>
          )}

          {phase === 'answer' && (
            <div>
              <p className="text-sm text-stone-600 mb-3">Hi {foundName}, here's your security question:</p>
              <div className="mb-4 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800">{securityQuestion}</div>
              <Field label="Your answer" error={error}>
                <input
                  type="text"
                  value={answer}
                  onChange={e => {
                    setAnswer(e.target.value);
                    setError('');
                  }}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </Field>
              <button
                type="button"
                onClick={handleAnswer}
                disabled={loading}
                className="w-full px-5 py-2 rounded-md bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-60"
              >
                {loading ? 'Checking…' : 'Log in'}
              </button>
              <button type="button" onClick={switchToForgot} className="w-full mt-2 text-xs text-stone-500 hover:text-stone-700">
                Forgot your login?
              </button>
            </div>
          )}

          {phase === 'success' && profile && (
            <div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
                <Check size={24} />
              </div>
              <h3 className="text-center text-base font-medium text-stone-900 mb-4">Welcome back, {profile.firstName}!</h3>
              <dl className="text-sm space-y-2 mb-4">
                <div className="flex justify-between">
                  <dt className="text-stone-400">Age band</dt>
                  <dd className="text-stone-800">{profile.ageBand}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-stone-400 shrink-0">Top topics</dt>
                  <dd className="text-stone-800 text-right">{(profile.topics || []).map(id => TOPIC_LABELS[id] || id).join(', ')}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-400">Looking for</dt>
                  <dd className="text-stone-800">{profile.mood}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => onGoToCatalogue && onGoToCatalogue('foryou')}
                className="w-full px-4 py-2 rounded-md bg-amber-600 text-white text-sm hover:bg-amber-700"
              >
                See your book picks
              </button>
              <button
                type="button"
                onClick={() => onGoToCatalogue && onGoToCatalogue('browse')}
                className="w-full mt-2 text-xs text-stone-600 hover:text-stone-800"
              >
                Browse the full catalogue
              </button>
              <button type="button" onClick={resetLogin} className="w-full mt-2 text-xs text-stone-500 hover:text-stone-700">
                Log out
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <button type="button" onClick={switchToLogin} className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 mb-4">
            <ArrowLeft size={14} /> Back to log in
          </button>
          <h2 className="text-lg font-medium text-stone-900 mb-1">Reset your login</h2>

          {fPhase === 'identify' && (
            <div>
              <p className="text-sm text-stone-500 mb-4">
                Enter your username or email, and we'll send a reset code to the parent, guardian, or mentor email on file.
              </p>
              <Field label="Username or email" error={fError}>
                <input
                  type="text"
                  value={fIdentifier}
                  onChange={e => {
                    setFIdentifier(e.target.value);
                    setFError('');
                  }}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </Field>
              <button
                type="button"
                onClick={handleForgotIdentify}
                disabled={fLoading}
                className="w-full px-5 py-2 rounded-md bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-60"
              >
                {fLoading ? 'Looking…' : 'Send reset code'}
              </button>
            </div>
          )}

          {fPhase === 'code' && (
            <div>
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                {fEmailed ? (
                  <>A reset code was emailed to {fMaskedEmail}.</>
                ) : (
                  <>
                    No email service is configured yet, so here's the code that would normally go to {fMaskedEmail}:
                    <div className="mt-2 text-2xl font-mono tracking-widest text-stone-900">{fDevCode}</div>
                  </>
                )}
              </div>
              <Field label="Enter the code" error={fError}>
                <input
                  type="text"
                  value={fCodeInput}
                  onChange={e => {
                    setFCodeInput(e.target.value);
                    setFError('');
                  }}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </Field>
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={fLoading}
                className="w-full px-5 py-2 rounded-md bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-60"
              >
                {fLoading ? 'Checking…' : 'Verify code'}
              </button>
            </div>
          )}

          {fPhase === 'reset' && (
            <div>
              <div className="mb-4 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                Your username is <span className="font-medium text-stone-900">{fUsername}</span>
              </div>
              {fError && <p className="text-xs text-rose-600 mb-3">{fError}</p>}
              <Field label="New security question">
                <div className="grid gap-2">
                  {SECURITY_QUESTIONS.map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setFNewQuestion(q)}
                      className={`w-full text-left rounded-lg border px-4 py-2.5 text-sm ${
                        fNewQuestion === q ? 'border-amber-600 bg-amber-50 text-stone-800' : 'border-stone-300 text-stone-700 hover:border-amber-400'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </Field>
              {fNewQuestion === 'Write my own question' && (
                <Field label="Your question">
                  <input
                    type="text"
                    value={fNewQuestionCustom}
                    onChange={e => setFNewQuestionCustom(e.target.value)}
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </Field>
              )}
              <Field label="New answer">
                <input
                  type="text"
                  value={fNewAnswer}
                  onChange={e => setFNewAnswer(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </Field>
              <Field label="Type it again">
                <input
                  type="text"
                  value={fNewAnswerConfirm}
                  onChange={e => setFNewAnswerConfirm(e.target.value)}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </Field>
              <button
                type="button"
                onClick={handleSaveNewSecurity}
                disabled={fLoading}
                className="w-full px-5 py-2 rounded-md bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-60"
              >
                {fLoading ? 'Saving…' : 'Save new security question'}
              </button>
            </div>
          )}

          {fPhase === 'done' && (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
                <Check size={24} />
              </div>
              <p className="text-sm text-stone-700 mb-4">All set! You can log in now with your username and new security question.</p>
              <button type="button" onClick={switchToLogin} className="px-4 py-2 rounded-md bg-stone-800 text-white text-sm hover:bg-stone-700">
                Back to log in
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddBookForm({ adminPassword, editingBook, onSaved, onViewCatalogue, onCancelEdit }) {
  const isEditing = !!editingBook;
  const [book, setBook] = useState(editingBook || initialBook);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState('');
  const [uploading, setUploading] = useState({});

  function setField(field, value) {
    setBook(b => ({ ...b, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  }

  function toggleFormatAvailable(key) {
    setBook(b => {
      const turningOn = !b.formats[key].available;
      const next = {
        ...b,
        formats: {
          ...b.formats,
          [key]: key === 'physical' ? { available: turningOn, copies: b.formats.physical.copies || 1 } : { available: turningOn },
        },
      };
      if (key === 'ebook' && !turningOn) next.ebookFile = null;
      if (key === 'audiobook' && !turningOn) next.audiobookFile = null;
      return next;
    });
    setErrors(e => ({ ...e, formats: undefined }));
  }

  async function handleFileUpload(field, file) {
    if (!file) return;
    setUploading(u => ({ ...u, [field]: true }));
    setErrors(e => ({ ...e, [field]: undefined }));
    try {
      const signed = await callFunction('storage-sign-upload', { adminPassword, fileName: file.name });
      const { error: uploadError } = await supabase.storage.from('book-files').uploadToSignedUrl(signed.path, signed.token, file);
      if (uploadError) throw uploadError;
      setBook(b => ({ ...b, [field]: { name: file.name, sizeKB: Math.round(file.size / 1024), path: signed.path } }));
    } catch {
      setErrors(e => ({ ...e, [field]: 'Upload failed — please try again.' }));
    }
    setUploading(u => ({ ...u, [field]: false }));
  }

  function toggleAgeBand(band) {
    setBook(b => (b.ageBands.includes(band) ? { ...b, ageBands: b.ageBands.filter(x => x !== band) } : { ...b, ageBands: [...b.ageBands, band] }));
    setErrors(e => ({ ...e, ageBands: undefined }));
  }

  function toggleTopic(id) {
    setBook(b => (b.topics.includes(id) ? { ...b, topics: b.topics.filter(x => x !== id) } : { ...b, topics: [...b.topics, id] }));
    setErrors(e => ({ ...e, topics: undefined }));
  }

  function toggleMood(m) {
    setBook(b => (b.moods.includes(m) ? { ...b, moods: b.moods.filter(x => x !== m) } : { ...b, moods: [...b.moods, m] }));
  }

  function toggleHobby(h) {
    setBook(b => (b.hobbies.includes(h) ? { ...b, hobbies: b.hobbies.filter(x => x !== h) } : { ...b, hobbies: [...b.hobbies, h] }));
  }

  function validate() {
    const e = {};
    if (!book.title.trim()) e.title = 'Enter a title';
    if (!book.author.trim()) e.author = 'Enter an author';
    if (!CATALOGUE_FORMATS.some(f => book.formats[f.key].available)) e.formats = 'Select at least one format';
    if (!book.ageBands.length) e.ageBands = 'Select at least one age band';
    if (!book.topics.length) e.topics = 'Select at least one topic';
    if (book.pageCount && (isNaN(parseInt(book.pageCount, 10)) || parseInt(book.pageCount, 10) <= 0)) e.pageCount = 'Enter a valid page count';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const savedTitle = book.title;
      if (isEditing) {
        await callFunction('books-update', { adminPassword, id: editingBook.id, book: toDbBook(book) });
      } else {
        await callFunction('books-add', { adminPassword, book: toDbBook(book) });
        setBook(initialBook);
      }
      setLastSaved(savedTitle);
      onSaved && onSaved();
    } catch (err) {
      setErrors(e => ({ ...e, save: err.message || "Couldn't save that just now — please try again." }));
    }
    setSaving(false);
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="text-lg font-medium text-stone-900">{isEditing ? `Editing "${editingBook.title}"` : 'Add a book'}</h2>
        {isEditing && (
          <button type="button" onClick={onCancelEdit} className="text-xs text-stone-500 hover:text-stone-700 shrink-0 mt-1">
            Cancel
          </button>
        )}
      </div>
      <p className="text-sm text-stone-500 mb-4">Tag it well — these fields are what the recommendation engine matches against.</p>

      {lastSaved && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center justify-between gap-3">
          <span>✓ "{lastSaved}" was {isEditing ? 'updated' : 'added to the catalogue'}.</span>
          <button
            type="button"
            onClick={() => {
              setLastSaved('');
              onViewCatalogue && onViewCatalogue();
            }}
            className="text-xs font-medium text-emerald-800 underline shrink-0"
          >
            View in catalogue
          </button>
        </div>
      )}

      <Field label="Title" error={errors.title}>
        <input
          type="text"
          value={book.title}
          onChange={e => setField('title', e.target.value)}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
      </Field>

      <Field label="Author" error={errors.author}>
        <input
          type="text"
          value={book.author}
          onChange={e => setField('author', e.target.value)}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
      </Field>

      <Field label="Page count (optional)" error={errors.pageCount}>
        <input
          type="number"
          value={book.pageCount}
          onChange={e => setField('pageCount', e.target.value)}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
      </Field>

      <Field label="Short description (optional)">
        <input
          type="text"
          value={book.description}
          onChange={e => setField('description', e.target.value)}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
        />
      </Field>

      <Field label="Formats available" error={errors.formats}>
        <div className="flex flex-wrap gap-2">
          {CATALOGUE_FORMATS.map(f => (
            <Pill key={f.key} selected={book.formats[f.key].available} onClick={() => toggleFormatAvailable(f.key)}>
              {f.label}
            </Pill>
          ))}
        </div>

        {book.formats.physical.available && (
          <div className="mt-2 flex items-center gap-2">
            <label className="text-xs text-stone-500">Physical copies:</label>
            <input
              type="number"
              min={1}
              value={book.formats.physical.copies}
              onChange={e => setField('formats', { ...book.formats, physical: { available: true, copies: parseInt(e.target.value, 10) || 1 } })}
              className="w-20 rounded-md border border-stone-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        )}

        {book.formats.ebook.available && (
          <div className="mt-3 rounded-md border border-stone-200 bg-stone-50 p-3">
            <label className="text-xs font-medium text-stone-600 block mb-1.5">Upload e-book file</label>
            <input
              type="file"
              accept=".epub,.pdf,.mobi,.azw3"
              disabled={uploading.ebookFile}
              onChange={e => handleFileUpload('ebookFile', e.target.files[0])}
              className="text-xs text-stone-600"
            />
            {uploading.ebookFile && <p className="text-xs text-stone-500 mt-1.5">Uploading…</p>}
            {errors.ebookFile && <p className="text-xs text-rose-600 mt-1.5">{errors.ebookFile}</p>}
            {book.ebookFile && !uploading.ebookFile && (
              <p className="text-xs text-emerald-700 mt-1.5">Uploaded: {book.ebookFile.name} ({book.ebookFile.sizeKB} KB)</p>
            )}
            <p className="text-xs text-stone-400 mt-1.5">Only logged-in members will be able to open this file.</p>
          </div>
        )}

        {book.formats.audiobook.available && (
          <div className="mt-3 rounded-md border border-stone-200 bg-stone-50 p-3">
            <label className="text-xs font-medium text-stone-600 block mb-1.5">Upload audiobook file</label>
            <input
              type="file"
              accept=".mp3,.m4a,.m4b"
              disabled={uploading.audiobookFile}
              onChange={e => handleFileUpload('audiobookFile', e.target.files[0])}
              className="text-xs text-stone-600"
            />
            {uploading.audiobookFile && <p className="text-xs text-stone-500 mt-1.5">Uploading…</p>}
            {errors.audiobookFile && <p className="text-xs text-rose-600 mt-1.5">{errors.audiobookFile}</p>}
            {book.audiobookFile && !uploading.audiobookFile && (
              <p className="text-xs text-emerald-700 mt-1.5">Uploaded: {book.audiobookFile.name} ({book.audiobookFile.sizeKB} KB)</p>
            )}
            <p className="text-xs text-stone-400 mt-1.5">Only logged-in members will be able to open this file.</p>
          </div>
        )}
      </Field>

      <Field label="Age band(s)" error={errors.ageBands}>
        <div className="flex flex-wrap gap-2">
          {AGE_BANDS.map(band => (
            <Pill key={band} selected={book.ageBands.includes(band)} onClick={() => toggleAgeBand(band)}>
              {band}
            </Pill>
          ))}
        </div>
      </Field>

      <Field label="Topics (tag all that apply)" error={errors.topics}>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map(t => (
            <Pill key={t.id} selected={book.topics.includes(t.id)} onClick={() => toggleTopic(t.id)}>
              {t.label}
            </Pill>
          ))}
        </div>
      </Field>

      <Field label="Reading personality it best suits (optional)">
        <div className="flex flex-wrap gap-2">
          {PERSONALITY.map(p => (
            <Pill key={p.id} selected={book.personality === p.id} onClick={() => setField('personality', book.personality === p.id ? '' : p.id)}>
              {p.label}
            </Pill>
          ))}
        </div>
      </Field>

      <Field label="Moods it fits (optional)">
        <div className="flex flex-wrap gap-2">
          {MOODS.map(m => (
            <Pill key={m} selected={book.moods.includes(m)} onClick={() => toggleMood(m)}>
              {m}
            </Pill>
          ))}
        </div>
      </Field>

      <Field label="Relevant hobbies (optional)">
        <div className="flex flex-wrap gap-2">
          {[...HOBBIES_BASE, ...HOBBIES_TRAILBLAZER_EXTRA].map(h => (
            <Pill key={h} selected={book.hobbies.includes(h)} onClick={() => toggleHobby(h)}>
              {h}
            </Pill>
          ))}
        </div>
        <p className="text-xs text-stone-400 mt-1">Used to match books to members' hobbies in recommendations.</p>
      </Field>

      {errors.save && <p className="text-xs text-rose-600 mb-3">{errors.save}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full px-5 py-2 rounded-md bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-60"
      >
        {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add to catalogue'}
      </button>
    </div>
  );
}

function FileAccessButton({ bookId, fileType, label, memberToken, onNeedLogin }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    if (!memberToken) {
      onNeedLogin && onNeedLogin();
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await callFunction('get-file-url', { token: memberToken, bookId, fileType });
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch {
      setError("Couldn't open that — try again.");
    }
    setLoading(false);
  }

  return (
    <div>
      <button type="button" onClick={handleClick} disabled={loading} className="text-xs text-amber-700 underline disabled:opacity-60">
        {loading ? 'Opening…' : memberToken ? label : `Log in to ${label.toLowerCase()}`}
      </button>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function BookCard({ book, memberToken, onNeedLogin, onEdit }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-stone-900">{book.title}</h3>
          <p className="text-xs text-stone-500">{book.author}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {book.pageCount && <span className="text-xs text-stone-400">{book.pageCount}p</span>}
          {onEdit && (
            <button type="button" onClick={() => onEdit(book)} className="text-xs text-stone-400 hover:text-amber-700 underline">
              Edit
            </button>
          )}
        </div>
      </div>

      {book.description && <p className="text-xs text-stone-500 mt-2">{book.description}</p>}

      <div className="flex flex-wrap gap-1.5 mt-3">
        {CATALOGUE_FORMATS.map(f => {
          const info = book.formats?.[f.key];
          const available = info?.available;
          return (
            <span
              key={f.key}
              className={`text-xs rounded-full px-2 py-0.5 border ${
                available ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-stone-200 bg-stone-50 text-stone-400'
              }`}
            >
              {f.label}
              {available && f.key === 'physical' && info.copies ? ` (${info.copies})` : ''}
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2">
        {(book.ageBands || []).map(band => (
          <BandBadge key={band} band={band} />
        ))}
      </div>

      {book.topics?.length > 0 && <p className="text-xs text-stone-400 mt-2">{book.topics.map(id => TOPIC_LABELS[id] || id).join(' · ')}</p>}

      {(book.ebookFile || book.audiobookFile) && (
        <div className="flex flex-wrap gap-3 mt-2">
          {book.ebookFile && (
            <FileAccessButton bookId={book.id} fileType="ebook" label="Open e-book file" memberToken={memberToken} onNeedLogin={onNeedLogin} />
          )}
          {book.audiobookFile && (
            <FileAccessButton
              bookId={book.id}
              fileType="audiobook"
              label="Open audiobook file"
              memberToken={memberToken}
              onNeedLogin={onNeedLogin}
            />
          )}
        </div>
      )}
    </div>
  );
}

function BrowseView({ books, loading, memberToken, onNeedLogin, onEdit }) {
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState('');
  const [bandFilter, setBandFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');

  const filtered = books.filter(b => {
    if (search && !`${b.title} ${b.author}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (formatFilter && !b.formats?.[formatFilter]?.available) return false;
    if (bandFilter && !(b.ageBands || []).includes(bandFilter)) return false;
    if (topicFilter && !(b.topics || []).includes(topicFilter)) return false;
    return true;
  });

  if (loading) return <p className="text-sm text-stone-400">Loading catalogue…</p>;

  if (books.length === 0) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-8 text-center">
        <BookOpen className="mx-auto text-stone-300 mb-3" size={32} />
        <p className="text-sm text-stone-500">No books in the catalogue yet. Check back soon, or ask an admin to add some.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white border border-stone-200 rounded-lg p-4 mb-4">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-2.5 text-stone-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search title or author"
            className="w-full rounded-md border border-stone-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={formatFilter} onChange={e => setFormatFilter(e.target.value)} className="rounded-md border border-stone-300 px-2 py-1.5 text-xs text-stone-700">
            <option value="">All formats</option>
            {CATALOGUE_FORMATS.map(f => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          <select value={bandFilter} onChange={e => setBandFilter(e.target.value)} className="rounded-md border border-stone-300 px-2 py-1.5 text-xs text-stone-700">
            <option value="">All ages</option>
            {AGE_BANDS.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <select value={topicFilter} onChange={e => setTopicFilter(e.target.value)} className="rounded-md border border-stone-300 px-2 py-1.5 text-xs text-stone-700">
            <option value="">All topics</option>
            {TOPICS.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-stone-400 mb-2">{filtered.length} of {books.length} books</p>

      <div className="grid gap-3">
        {filtered.map(b => (
          <BookCard key={b.id} book={b} memberToken={memberToken} onNeedLogin={onNeedLogin} onEdit={onEdit} />
        ))}
        {filtered.length === 0 && <p className="text-sm text-stone-400 text-center py-6">No books match those filters.</p>}
      </div>
    </div>
  );
}

function RecommendationsView({ profile, books, loading, memberToken, onNeedLogin }) {
  if (!profile) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-8 text-center">
        <p className="text-sm text-stone-500 mb-4">Log in to see books picked for you.</p>
        <button type="button" onClick={onNeedLogin} className="px-4 py-2 rounded-md bg-amber-600 text-white text-sm hover:bg-amber-700">
          Log in
        </button>
      </div>
    );
  }

  if (loading) return <p className="text-sm text-stone-400">Loading catalogue…</p>;

  const results = computeRecommendations(profile, books);

  if (results.length === 0) {
    return (
      <div className="bg-white border border-stone-200 rounded-lg p-8 text-center">
        <p className="text-sm text-stone-500">Nothing in the catalogue matches your profile yet — check back as more books get added.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {results.map(({ book, score }) => (
        <div key={book.id}>
          <BookCard book={book} memberToken={memberToken} onNeedLogin={onNeedLogin} />
          <p className="text-xs text-stone-400 mt-1 ml-1">{Math.round(score * 100)}% match</p>
        </div>
      ))}
    </div>
  );
}

function CatalogueFlow({ memberToken, memberProfile, onNeedLogin, initialScreen }) {
  const [screen, setScreen] = useState(initialScreen || 'browse');
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [editingBook, setEditingBook] = useState(null);

  function startEdit(book) {
    setEditingBook(book);
    setScreen('add');
  }

  function goToAddTab() {
    setEditingBook(null);
    setScreen('add');
  }

  async function loadBooks() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('books').select('*').order('title');
      if (error) throw error;
      setBooks((data || []).map(fromDbBook));
    } catch {
      setBooks([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadBooks();
  }, []);

  async function seedSampleBooks() {
    setSeeding(true);
    try {
      await callFunction('books-seed', { adminPassword, books: SAMPLE_BOOKS.map(toDbBook) });
    } catch {
      // reload below will simply show whatever, if anything, made it through
    }
    await loadBooks();
    setSeeding(false);
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-stone-900">Book catalogue</h1>
        <p className="text-sm text-stone-500 mt-1">Browse what's available, or add new titles.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setScreen('browse')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${screen === 'browse' ? 'bg-stone-800 text-white' : 'bg-white border border-stone-300 text-stone-600'}`}
        >
          Browse
        </button>
        <button
          type="button"
          onClick={() => setScreen('foryou')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${screen === 'foryou' ? 'bg-stone-800 text-white' : 'bg-white border border-stone-300 text-stone-600'}`}
        >
          For You
        </button>
        <button
          type="button"
          onClick={goToAddTab}
          className={`px-4 py-2 rounded-full text-sm font-medium ${screen === 'add' ? 'bg-stone-800 text-white' : 'bg-white border border-stone-300 text-stone-600'}`}
        >
          Add a book
        </button>
      </div>

      {screen === 'browse' && (
        <BrowseView books={books} loading={loading} memberToken={memberToken} onNeedLogin={onNeedLogin} onEdit={startEdit} />
      )}

      {screen === 'foryou' && (
        <RecommendationsView profile={memberProfile} books={books} loading={loading} memberToken={memberToken} onNeedLogin={onNeedLogin} />
      )}

      {screen === 'add' &&
        (isAdmin ? (
          <>
            {books.length === 0 && !editingBook && (
              <button
                type="button"
                onClick={seedSampleBooks}
                disabled={seeding}
                className="mb-4 px-4 py-2 rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-sm hover:bg-amber-100 disabled:opacity-60"
              >
                {seeding ? 'Adding…' : 'Add 6 sample books to test with'}
              </button>
            )}
            <AddBookForm
              key={editingBook?.id || 'new'}
              adminPassword={adminPassword}
              editingBook={editingBook}
              onSaved={loadBooks}
              onViewCatalogue={() => {
                setEditingBook(null);
                setScreen('browse');
              }}
              onCancelEdit={() => {
                setEditingBook(null);
                setScreen('browse');
              }}
            />
          </>
        ) : (
          <AdminGate
            onUnlock={pwd => {
              setAdminPassword(pwd);
              setIsAdmin(true);
            }}
          />
        ))}
    </>
  );
}

export default function App() {
  const [screen, setScreen] = useState('register');
  const [memberToken, setMemberToken] = useState(null);
  const [memberProfile, setMemberProfile] = useState(null);
  const [catalogueTab, setCatalogueTab] = useState('browse');

  return (
    <div className="w-full max-w-xl mx-auto p-6 bg-stone-50 min-h-screen">
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setScreen('register')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${screen === 'register' ? 'bg-stone-800 text-white' : 'bg-white border border-stone-300 text-stone-600'}`}
        >
          Register
        </button>
        <button
          type="button"
          onClick={() => setScreen('login')}
          className={`px-4 py-2 rounded-full text-sm font-medium ${screen === 'login' ? 'bg-stone-800 text-white' : 'bg-white border border-stone-300 text-stone-600'}`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => {
            setCatalogueTab('browse');
            setScreen('catalogue');
          }}
          className={`px-4 py-2 rounded-full text-sm font-medium ${screen === 'catalogue' ? 'bg-stone-800 text-white' : 'bg-white border border-stone-300 text-stone-600'}`}
        >
          Catalogue
        </button>
      </div>

      {screen === 'register' && <RegisterFlow />}
      {screen === 'login' && (
        <LoginFlow
          onGoToCatalogue={tab => {
            setCatalogueTab(tab || 'browse');
            setScreen('catalogue');
          }}
          onLoginSuccess={(token, profile) => {
            setMemberToken(token);
            setMemberProfile(profile);
          }}
          onLogout={() => {
            setMemberToken(null);
            setMemberProfile(null);
          }}
        />
      )}
      {screen === 'catalogue' && (
        <CatalogueFlow
          memberToken={memberToken}
          memberProfile={memberProfile}
          onNeedLogin={() => setScreen('login')}
          initialScreen={catalogueTab}
        />
      )}
    </div>
  );
}
