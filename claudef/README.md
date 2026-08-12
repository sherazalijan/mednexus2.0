# MedNexus Premium UI

CRITICAL CONTEXT

I have already attached my CURRENT WORKING MEDNEXUS FRONTEND.

This frontend already contains:

- Working API integrations

- Working service layer

- Working authentication

- Working routing

- Working TypeScript types

- Working backend contracts

- Working admin/student flows

- Working database integration

You MUST use this codebase as the source of truth.

DO NOT create new APIs.

DO NOT create mock services.

DO NOT create fake endpoints.

DO NOT create hardcoded data.

DO NOT invent backend response structures.

Before making changes:

1. Inspect all existing services

2. Inspect all existing API calls

3. Inspect all existing types

4. Inspect all existing route guards

5. Inspect all existing auth logic

When creating new UI files:

- Reuse existing services

- Reuse existing API functions

- Reuse existing hooks

- Reuse existing authentication

- Reuse existing route structure

- Reuse existing TypeScript interfaces

If you redesign a page, move the existing functionality into the new UI.

DO NOT replace working functionality.

DO NOT remove existing integrations.

The goal is:

CURRENT WORKING LOGIC

+

NEW PREMIUM UI

NOT

NEW UI

+

NEW LOGIC

Every button, action, form, table, chart, approval action, upload action, activate action, suspend action, login action, registration action, profile action, quiz action, and dashboard action must continue using the existing backend integration.

Treat the attached MedNexus frontend as the implementation source and only upgrade the presentation layer.
MEDNEXUS UI REDESIGN TASK

The application already works.

DO NOT change:

- Backend APIs

- Services

- Authentication logic

- Database contracts

- Existing functionality

ONLY redesign the UI.

IMPORTANT:

The current UI feels too small and constrained.

Many pages are rendered inside narrow containers and do not use the full screen width.

I want a modern premium SaaS medical platform layout similar to PulsePrep.

SCREEN USAGE REQUIREMENTS:

- Use full-width responsive layouts

- Remove unnecessarily narrow containers

- Increase content width significantly

- Use proper max-width values (1400px-1600px where appropriate)

- Dashboard should feel expansive and professional

- Utilize available desktop screen space

- Better spacing and section hierarchy

- Responsive on mobile, tablet and desktop

DESIGN INSPIRATION:

Use PulsePrep as inspiration for:

- Hero sections

- Visual hierarchy

- Dashboard structure

- Feature cards

- Pricing/subscription cards

- User onboarding flow

- Modern educational platform design

DO NOT COPY PulsePrep.

Create a unique MedNexus identity.

MEDNEXUS BRAND COLORS:

Primary: #2563EB

Secondary: #0F172A

Accent: #14B8A6

UI REQUIREMENTS:

1. LOGIN PAGE

- Premium medical platform design

- Split-screen layout on desktop

- Feature highlights

- Better branding

- Better typography

- Medical illustrations/icons

- Professional animations

2. REGISTRATION PAGE

- Multi-step modern registration

- Beautiful card design

- Profile image upload

- Payment proof upload

- Subscription selection section

- Better validation UI

3. STUDENT DASHBOARD

- Full-width dashboard

- Welcome section

- Analytics cards

- Progress charts

- Recent activity

- Continue learning section

- Weak topics section

- Quick actions

- Bookmarks preview

- Revision center preview

4. PROFILE PAGE

- Edit profile

- Change password

- Subscription details

- Account status

- Quiz history

- Achievement section

5. ADMIN DASHBOARD

- Enterprise-grade dashboard

- Large analytics cards

- Charts and graphs

- User approval center

- Pending payment approvals

- User management controls

- Better data visualization

PAYMENT WORKFLOW:

Students:

- Register

- Upload payment screenshot

- Pending approval state

Admins:

- View screenshot

- Approve

- Reject

- Suspend

- Activate

IMPORTANT:

The Activate and Suspend functionality currently appears broken.

Investigate and fix the integration.

Do not create fake APIs.

Use existing endpoints.

If backend endpoints are missing, clearly identify them.

DESIGN QUALITY TARGET:

The final UI should feel comparable to:

- PulsePrep

- Amboss

- UWorld

- Modern SaaS dashboards

It should NOT look like a student project.

FINAL CHECK:

Run npm run build.

Fix all TypeScript errors.

Fix all import issues.

Fix all route issues.

Provide:

1. Files changed

2. Features implemented

3. Build output

4. Any backend endpoint issues found

Do not stop until the build passes successfully.

# MedNexus V2 — Complete Frontend Architectural & API Integration Blueprint

This document provides a comprehensive technical specification of the **MedNexus** frontend platform aligned with the production **FastAPI + PostgreSQL** backend. Use this document as an authoritative guide for any AI model or developer to build, reconstruct, or extend the MedNexus UI.

---

## 1. System Overview & Technology Stack

### Tech Stack

- **Framework**: React 19 + TypeScript (Strict Mode, `verbatimModuleSyntax` enabled)

- **Bundler**: Vite

- **Routing**: React Router v7 (`react-router`)

- **Styling**: Vanilla CSS / TailwindCSS v4 + Custom Design Tokens

- **Animations**: Framer Motion

- **Icons**: Lucide React (`lucide-react`)

- **Charts**: Recharts

- **HTTP Client**: Axios with Interceptors

### Design System & Branding Tokens

```css

:root {

  --color-primary: #2563EB;        /* Royal Medical Blue */

  --color-primary-hover: #1D4ED8;

  --color-secondary: #0F172A;      /* Deep Navy / Slate 900 */

  --color-accent: #14B8A6;         /* Teal Accent */

  --color-accent-hover: #0D9488;

  --color-surface: #F8FAFC;        /* Light Gray Background */

  --font-sans: 'Inter', sans-serif;

  --font-heading: 'Plus Jakarta Sans', sans-serif;

}

```

---

## 2. Authentication Architecture & Token Lifecycle

### Storage Keys

The frontend persists session data in `localStorage`:

- `access_token` (JWT string)

- `refresh_token` (Opaque UUID string)

- `user_id` (Integer parsed to string)

- `full_name` (User string)

- `role` (`"student"` | `"admin"`)

### Axios Interceptor (`src/services/api.ts`)

```typescript

import axios from 'axios';

const api = axios.create({

  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',

});

// Request Interceptor: Inject JWT token into Authorization header

api.interceptors.request.use((config) => {

  const token = localStorage.getItem('access_token');

  if (token) {

    config.headers.Authorization = `Bearer ${token}`;

  }

  return config;

});

// Response Interceptor: Handle 401 Unauthorized (Auto-Logout)

api.interceptors.response.use(

  (response) => response,

  (error) => {

    if (error.response?.status === 401) {

      localStorage.removeItem('access_token');

      localStorage.removeItem('refresh_token');

      localStorage.removeItem('user_id');

      localStorage.removeItem('full_name');

      localStorage.removeItem('role');

      if (window.location.pathname !== '/login') {

        window.location.href = '/login';

      }

    }

    return Promise.reject(error);

  }

);

export default api;

```

---

## 3. Data Models & TypeScript Contracts

### `types/auth.ts`

```typescript

export interface LoginRequest {

  email: string;

  password: string;

}

export interface LoginResponse {

  access_token: string;

  refresh_token: string;

  token_type: string;

  user_id: number;

  full_name: string;

  role: 'student' | 'admin';

  new_device?: boolean;

}

export interface AuthUser {

  user_id: number;

  full_name: string;

  role: 'student' | 'admin';

  access_token: string;

  refresh_token?: string;

}

export interface PasswordChangeRequest {

  current_password: string;

  new_password: string;

}

```

### `types/user.ts`

```typescript

export interface User {

  id: number;

  full_name: string;

  email: string;

  role: 'student' | 'admin';

  account_status: 'active' | 'pending' | 'suspended' | 'disabled';

  created_at?: string;

}

export interface CreateUserRequest {

  full_name: string;

  email: string;

  role: 'student' | 'admin';

}

export interface CreateUserResponse extends User {

  temporary_password?: string;

}

export interface UserProfile {

  id: number;

  full_name: string;

  email: string;

  role: string;

  account_status: string;

  created_at?: string;

}

export interface UserStats {

  quizzes_taken: number;

  correct_answers: number;

  incorrect_answers: number;

  average_score: number;

}

export interface QuizHistory {

  id: number;

  quiz_type: string;

  chapter_id: number | null;

  total_questions: number;

  correct_answers: number;

  score_percentage: number;

  completed_at: string;

}

export interface Subscription {

  plan_name?: string;

  start_date?: string;

  end_date?: string;

  active: boolean;

}

export interface DashboardStats {

  total_users: number;

  active_users: number;

  disabled_users: number;

  total_books: number;

  total_chapters: number;

  total_mcqs: number;

  total_attempts: number;

  average_score: number;

}

export interface LeaderboardEntry {

  rank: number;

  user_id: number;

  full_name: string;

  total_attempts: number;

  score_percentage: number;

}

```

### `types/mcq.ts`

```typescript

export interface MCQ {

  id: number;

  chapter_id?: number;

  question: string;

  option_a: string;

  option_b: string;

  option_c: string;

  option_d: string;

  correct_answer: 'A' | 'B' | 'C' | 'D';

  explanation: string | null;

}

export interface CreateMCQRequest {

  chapter_id: number;

  question: string;

  option_a: string;

  option_b: string;

  option_c: string;

  option_d: string;

  correct_answer: 'A' | 'B' | 'C' | 'D';

  explanation?: string;

  page_number?: number;

}

export interface QuizAnswer {

  mcq_id: number;

  selected_answer: string;

}

export interface QuizSubmitRequest {

  answers: QuizAnswer[];

  chapter_id?: number;

  quiz_type?: string;

}

export interface QuizResultItem {

  mcq_id: number;

  question: string;

  your_answer: string;

  correct_answer: string;

  is_correct: boolean;

  explanation: string | null;

}

export interface QuizSubmitResponse {

  total_questions: number;

  correct: number;

  incorrect: number;

  score: number;

  results: QuizResultItem[];

}

export interface Bookmark {

  bookmark_id: number;

  created_at: string;

  mcq_id: number;

  question: string;

  option_a: string;

  option_b: string;

  option_c: string;

  option_d: string;

  correct_answer: string;

  explanation: string | null;

}

```

---

## 4. Complete Backend API Endpoint Reference

| Service Module | HTTP Method | API Endpoint | Body / Query Params | Backend Handler | Response Description |

|----------------|-------------|--------------|----------------------|-----------------|----------------------|

| **Auth** | `POST` | `/auth/login` | `{ email, password }` | `login` | Returns `TokenPair` (`access_token`, `refresh_token`, `user_id`, `full_name`, `role`) |

| **Auth** | `POST` | `/auth/refresh` | `{ refresh_token }` | `refresh` | Returns new `TokenPair` with rotated tokens |

| **Auth** | `POST` | `/auth/logout` | `{ refresh_token }` | `logout` | Revokes refresh token, returns `204 No Content` |

| **Auth** | `POST` | `/auth/password-change` | `{ current_password, new_password }` | `change_password` | Requires Bearer token; updates password, returns new `TokenPair` |

| **Admin** | `GET` | `/admin/dashboard` | None | `dashboard` | Returns `{ total_users, active_users, disabled_users, total_books, total_chapters, total_mcqs, total_attempts, average_score }` |

| **Admin** | `GET` | `/admin/users` | None | `get_users` | Returns `User[]` (`id`, `full_name`, `email`, `role`, `account_status`) |

| **Admin** | `POST` | `/admin/create-user` | `{ full_name, email, role }` | `create_user` | Creates user with auto-generated temp password; returns `CreateUserResponse` |

| **Admin** | `PATCH` | `/admin/users/{id}/status` | `{ account_status }` | `update_user_status` | Options: `"active"`, `"suspended"`, `"disabled"`. Returns updated `User` |

| **Admin** | `GET` | `/admin/leaderboard` | `?scope=global\|weekly\|monthly\|book\|chapter` | `leaderboard` | Returns `LeaderboardEntry[]` (`rank`, `user_id`, `full_name`, `total_attempts`, `score_percentage`) |

| **Books** | `GET` | `/books` | None | `get_books` | Returns `Book[]` (`id`, `title`, `description`) |

| **Books** | `POST` | `/books` | `{ title, description }` | `create_book` | Returns created `Book` |

| **Books** | `DELETE` | `/books/{id}` | None | `delete_book` | Returns `204 No Content` |

| **Chapters** | `GET` | `/books/{bookId}/chapters` | None | `get_chapters` | Returns `Chapter[]` (`id`, `chapter_name`, `book_id`) |

| **Chapters** | `POST` | `/books/{bookId}/chapters` | `{ chapter_name }` | `create_chapter` | Returns created `Chapter` |

| **MCQs** | `POST` | `/mcqs` | `{ chapter_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation }` | `create_mcq` | Returns created `MCQ` |

| **Quiz** | `GET` | `/quiz/random/{count}` | Path param `count` | `random_quiz` | Returns `MCQ[]` |

| **Quiz** | `GET` | `/quiz/chapter/{chapterId}/{mode}` | Path params: `chapterId`, `mode` (`sequential` \| `random`) | `chapter_quiz` | Returns `MCQ[]` |

| **Quiz** | `POST` | `/quiz/submit` | `{ answers: [{ mcq_id, selected_answer }], chapter_id, quiz_type }` | `submit_quiz` | Returns `QuizSubmitResponse` (`total_questions`, `correct`, `incorrect`, `score`, `results[]`) |

| **Users** | `GET` | `/users/{id}` | Path param `id` | `get_user` | Returns `UserProfile` (`id`, `full_name`, `email`, `role`, `account_status`) |

| **Users** | `GET` | `/users/{id}/history` | Path param `id` | `user_history` | Returns `QuizHistory[]` (`id`, `quiz_type`, `total_questions`, `correct_answers`, `score_percentage`, `completed_at`) |

| **Users** | `GET` | `/users/{id}/stats` | Path param `id` | `user_stats` | Returns `UserStats` (`quizzes_taken`, `correct_answers`, `incorrect_answers`, `average_score`) |

| **Users** | `GET` | `/users/{id}/subscription` | Path param `id` | `get_subscription` | Returns `Subscription` (`plan_name`, `start_date`, `end_date`, `active`) |

| **Bookmarks** | `GET` | `/bookmarks` | None | `list_bookmarks` | Returns flat `Bookmark[]` (`bookmark_id`, `mcq_id`, `question`, `option_a`, `option_b`, `option_c`, `option_d`, `correct_answer`, `explanation`) |

| **Bookmarks** | `POST` | `/bookmarks` | `{ mcq_id }` | `add_bookmark` | Returns `{ id, already_bookmarked }` |

| **Bookmarks** | `DELETE` | `/bookmarks/{mcqId}` | Path param `mcqId` | `remove_bookmark` | Returns `204 No Content` |

| **Announcements** | `GET` | `/announcements` | None | `get_active_announcements` | Returns `Announcement[]` (`id`, `title`, `message`, `created_at`, `expires_at`) |

| **Announcements** | `POST` | `/admin/announcements` | `{ title, message, expires_at }` | `create_announcement` | Admin only. Returns created `Announcement` |

---

## 5. Page-by-Page Integration Requirements

### Auth Pages

1. **Login Page (`/login`)**:

   - Form fields: Email, Password

   - On Submit: Call `authService.login({ email, password })`

   - Action: Store tokens, redirect based on `role` (`admin` -> `/admin/dashboard`, `student` -> `/student/dashboard`)

2. **Registration Page (`/register`)**:

   - PulsePrep-style premium flow: First Name, Last Name, Email, Password, Degree Selection, Academic Year, Payment Screenshot Upload, Terms Checkbox.

   - On Submit: Display pending verification screen with submitted details.

### Student Portal (`/student/*`)

1. **Dashboard (`/student/dashboard`)**:

   - Welcome Hero banner with user's name (`Dr. ${full_name}`).

   - Fetches in parallel: `userService.getStats(user_id)`, `userService.getHistory(user_id)`, `userService.getSubscription(user_id)`.

   - Displays 4 stat cards (Quizzes completed, Correct answers, Average accuracy %, Subscription status).

   - Renders `PerformanceChart` component mapping `history` dates vs `score_percentage`.

   - Displays recent quiz history list.

2. **Profile Management (`/student/profile`)**:

   - Fetches `userService.getProfile(user_id)` and `userService.getSubscription(user_id)`.

   - Displays avatar initials, email, role, and subscription status badge.

   - Change Password form: calls `authService.changePassword({ current_password, new_password })`.

3. **Books & Chapters (`/student/books` & `/student/books/:bookId/chapters`)**:

   - Fetches `bookService.getBooks()`.

   - On book select: navigates to chapters view and calls `chapterService.getChapters(bookId)`.

   - "Start Quiz" button: navigates to `/student/quiz/:chapterId`.

4. **Quiz Engine (`/student/quiz/:chapterId`)**:

   - Calls `quizService.getChapterQuiz(chapterId, 'sequential')`.

   - Card layout with options A, B, C, D selector.

   - Progress bar, question index tracker, prev/next buttons.

   - On Submit: calls `quizService.submitQuiz({ answers, chapter_id: Number(chapterId), quiz_type: 'chapter' })`.

   - Redirects to `/student/quiz-review` passing the `QuizSubmitResponse` state.

5. **Quiz Review (`/student/quiz-review`)**:

   - Displays score banner (`correct / total_questions` and `score%`).

   - Renders `QuizReviewCard` for each question showing: `question`, `your_answer`, `correct_answer`, green/red status badge, and `explanation`.

6. **Analytics (`/student/analytics`)**:

   - Calls `userService.getStats(user_id)` and `userService.getHistory(user_id)`.

   - Renders `PerformanceChart` and complete attempt log.

7. **Bookmarks (`/student/bookmarks`)**:

   - Calls `bookmarkService.getBookmarks()`.

   - Renders question cards with flat MCQ data and "Remove Bookmark" button calling `bookmarkService.removeBookmark(mcq_id)`.

8. **Announcements (`/student/announcements`)**:

   - Calls `announcementService.getAnnouncements()`.

   - Displays title, message, and formatted date.

### Admin Portal (`/admin/*`)

1. **Admin Dashboard (`/admin/dashboard`)**:

   - Calls `adminService.getDashboard()`.

   - Renders 8 enterprise stat cards: `total_users`, `active_users`, `disabled_users`, `total_books`, `total_chapters`, `total_mcqs`, `total_attempts`, `average_score`.

   - Quick action shortcut cards (Manage Users, Add Book, Upload MCQ, Create Announcement).

2. **User Management (`/admin/users`)**:

   - Calls `adminService.getUsers()`.

   - Displays table with user `full_name`, `email`, `role`, `account_status`.

   - Status Actions:

     - **Approve / Reactivate**: calls `adminService.updateUserStatus(id, 'active')`.

     - **Suspend**: calls `adminService.updateUserStatus(id, 'suspended')`.

   - **Create User Modal**: fields `full_name`, `email`, `role`. Calls `adminService.createUser({ full_name, email, role })`. Displays the server-generated `temporary_password` to copy.

3. **Book & Chapter Management (`/admin/books` & `/admin/books/:bookId/chapters`)**:

   - Create Book: `bookService.createBook({ title, description })`.

   - Delete Book: `bookService.deleteBook(id)`.

   - Create Chapter: `chapterService.createChapter(bookId, { chapter_name })`.

4. **MCQ Upload Wizard (`/admin/mcq-upload`)**:

   - Cascading dropdowns: Book -> Chapter.

   - Form fields: Question, Option A, Option B, Option C, Option D, Correct Answer (A/B/C/D), Explanation.

   - Calls `mcqService.createMCQ(...)`.

5. **Leaderboard (`/admin/leaderboard`)**:

   - Calls `adminService.getLeaderboard(scope)` with scope filter buttons (`global`, `weekly`, `monthly`).

   - Renders ranking table (`rank`, `full_name`, `total_attempts`, `score_percentage`).

6. **Announcements (`/admin/announcements`)**:

   - Modal form: Title, Message, Expiration Date.

   - Calls `announcementService.createAnnouncement({ title, message, expires_at })`.

---

## 6. How to Instruct Another AI to Build This

When prompting another AI (e.g. Claude, GPT-4, Cursor, v0, etc.) to rebuild or generate frontend code, give it this exact prompt instruction:

```text

You are a senior frontend engineer. Build a React + TypeScript + Vite web application for "MedNexus", a medical education platform.

Strict Rules:

1. Use the technical blueprint provided in the MedNexus specification document.

2. Authenticate all requests by attaching `Authorization: Bearer <access_token>` from localStorage.

3. Match Python FastAPI backend schemas exactly (use snake_case for API request/response properties: user_id, full_name, account_status, total_questions, correct_answers, score_percentage, etc.).

4. Handle account statuses: 'active', 'pending', 'suspended', 'disabled'.

5. Use Lucide React icons, Tailwind CSS, Recharts, and Framer Motion.

6. Implement the 24 backend API service endpoints defined in the specification.

7. Ensure zero TypeScript compilation errors.

```

---

*End of Specification Document*

You are a senior frontend engineer building the MedNexus Medical QBank frontend.

1. Strictly follow the blueprint in `mednexus_frontend_backend_blueprint.md`.

2. Authenticate all requests by reading `access_token` from localStorage and appending `Authorization: Bearer <access_token>`.

3. Match Python FastAPI backend schemas using exact `snake_case` property names (`user_id`, `full_name`, `account_status`, `total_questions`, `correct_answers`, `score_percentage`).

4. Implement both Student (`/student/*`) and Admin (`/admin/*`) role-protected layouts.

5. Use Lucide React icons, Tailwind CSS, Recharts for analytics, and Framer Motion for smooth transitions.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/18ec588a-9221-4b34-ac29-bdefa0696cd9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
