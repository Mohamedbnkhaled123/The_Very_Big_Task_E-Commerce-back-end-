# Backend Engineering Case Study: Modern E-Commerce API

This document provides a comprehensive technical overview of the E-Commerce backend infrastructure. It serves as a portfolio-quality case study detailing the architectural patterns, security engineering, API design, file processing pipelines, and database modeling implemented in the system.

## 1. Backend Overview

The backend is a robust RESTful API that serves as the central data and business logic hub for the E-Commerce platform. It acts as the intermediary between the Angular SPA frontend and the MongoDB database.

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (via Mongoose ODM)
- **API Architecture:** REST (Representational State Transfer) with JSON payloads
- **Authentication:** Stateless JWT (JSON Web Tokens) attached via Bearer headers
- **Main Resources:** Users, Products, Orders, Carts, CMS (Home content), Categories, Analytics
- **File Handling:** Multipart form uploads processed via Multer and Sharp (image compression & responsive variants)

**High-Level Architecture Flow:**
```text
Client (Angular SPA)
       ↓ (HTTP REST)
Express Router
       ↓
Global Middleware (CORS, Helmet, Rate Limiter, Body Parser)
       ↓
Resource Routes (e.g., /api/v1/product)
       ↓
Auth / Role Middleware (JWT verification, RBAC)
       ↓
Controllers (Request handling)
       ↓
Models (Mongoose Schemas / DB Logic)
       ↓
MongoDB
```

---

## 2. Backend Technology Stack

| Technology | Location / Usage | Problem Solved / Purpose |
| :--- | :--- | :--- |
| **Node.js / Express** | Core `server.js` | Provides the asynchronous, event-driven runtime and routing framework for the API. |
| **MongoDB / Mongoose** | `models/`, `config/db.config.js` | Flexible, NoSQL document storage with schema validation, default values, and rapid query execution. |
| **JWT & bcrypt** | `auth.controller.js`, `auth.middleware.js` | Secure password hashing (`bcrypt`) and stateless authentication (`jsonwebtoken`) across independent HTTP requests. |
| **Multer & Sharp** | `upload.middleware.js` | Intercepts multipart/form-data image uploads, resizes them, and converts them to optimized `WebP` variants before saving to disk. |
| **Helmet & CORS** | `server.js` | Hardens HTTP headers against common attacks (XSS, Clickjacking) and restricts cross-origin access. |
| **express-rate-limit** | `rateLimiter.middleware.js` | Prevents brute-force credential stuffing by limiting excessive requests to the `/auth` endpoints. |
| **Socket.io** | `server.js` | Establishes WebSocket connections for potential real-time features (e.g., live analytics or instant notifications). |
| **Compression** | `server.js` | Applies Gzip/Brotli compression to API JSON responses and static assets to reduce network payloads. |

---

## 3. Backend Architecture

The project strictly follows a modular Controller-Route-Model architecture, enforcing separation of concerns.

**Directory Responsibilities:**
- `routes/`: Maps HTTP methods (GET, POST, PUT, DELETE) and URL endpoints to specific controller functions, injecting middleware along the way.
- `controllers/`: Handles incoming HTTP requests, extracts parameters/body data, interacts with models, and formats the JSON response.
- `models/`: Defines the MongoDB schema (data types, validation, defaults, unique constraints, and indexes).
- `middlewares/`: Reusable logic injected before controllers (e.g., checking if a user is an admin, intercepting file uploads).
- `config/`: Centralized setup for external services (e.g., `db.config.js` for MongoDB connection).
- `utilities/`: Helper classes and functions (e.g., `appError.utility.js` for standardized error generation).

**Data Flow Example (Fetching Products):**
1. Request hits `GET /api/v1/product`.
2. `product.route.js` forwards the request to `getAllProducts` in `product.controller.js`.
3. The controller parses query strings (for filtering/pagination).
4. `Product.find()` is executed against the MongoDB database.
5. The controller returns a structured JSON response with a `200 OK` status.

---

## 4. REST API Design

The API exposes semantic, resource-oriented endpoints.

| Method | Endpoint | Purpose | Auth Required | Role |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | Authenticate user and return JWT | No | N/A |
| `GET` | `/api/v1/product` | Retrieve product catalog (with filters) | No | N/A |
| `POST` | `/api/v1/product` | Create a new product | Yes | Admin/Superadmin |
| `POST` | `/api/v1/cart` | Add a product to the user's cart | Yes | User |
| `GET` | `/api/v1/order/user-orders` | Retrieve orders for logged-in user | Yes | User |
| `PUT` | `/api/v1/cms/home` | Update dynamic homepage hero/banners | Yes | Admin/Superadmin |

All successful responses follow a predictable JSON structure:
```json
{
  "status": "success",
  "data": { ... }
}
```

---

## 5. Security Engineering

The backend implements a defense-in-depth security strategy.

**Security Strengths (Implemented):**
- **Authentication:** Passwords are mathematically hashed using `bcrypt` (never stored in plain text). JWTs are cryptographically signed using a `SECRET_KEY` from environment variables.
- **Role-Based Access Control (RBAC):** `role.middleware.js` explicitly blocks standard users from accessing destructive endpoints (like product deletion or CMS updates) by verifying the `role` claim in the decoded JWT.
- **Account Deactivation Handling:** The `auth.middleware.js` actively checks the database to ensure the user's account is still `isActive`, preventing deactivated admins from exploiting old, unexpired JWTs.
- **Brute Force Protection:** `express-rate-limit` is applied to `/api/v1/auth` endpoints to throttle repeated failed login attempts.
- **HTTP Header Hardening:** `Helmet` is configured to set secure HTTP headers, while `CORS` restricts access to authorized origins.
- **File Upload Security:** `upload.middleware.js` enforces a strict 5MB size limit and validates file extensions (MIME types) to prevent malicious executable uploads.

**Security Considerations / Remaining Risks:**
- **Stateless JWTs:** Because JWTs are completely stateless, there is no built-in way to forcefully revoke a compromised token before it expires, other than the `isActive` database check which requires a DB hit per request.
- **Refresh Tokens:** The current architecture uses long-lived access tokens without a Refresh Token rotation strategy.

---

## 6. File Upload & Image Processing Pipeline

The backend features an advanced image optimization pipeline, critical for satisfying the frontend's Core Web Vitals (LCP) requirements.

**The Pipeline (`upload.middleware.js`):**
1. **Intercept & Validate:** `multer` intercepts the multipart request, enforcing size limits (5MB) and type restrictions (images only).
2. **Temporary Storage:** The raw image is briefly saved to the `uploads/` directory.
3. **Sharp Processing (Compression & Responsive Variants):** 
   - Converts the image to the modern `WebP` format for superior compression.
   - Generates a **Main Variant** (max 1920x1920).
   - Generates a **Small Variant** (`-sm.webp`, max 640x640).
   - *Optionally* generates an **Extra-Small Variant** (`-xs.webp`, max 320x320) specifically engineered for Mobile Hero LCP slots.
4. **Cleanup:** The original, unoptimized file is deleted from disk.
5. **Static Serving:** The Express app serves these files statically with aggressive caching (`maxAge: '1y', immutable: true`).

---

## 7. Database Architecture & Modeling

The MongoDB database is accessed via Mongoose, utilizing robust schema validation.

**Key Modeling Features:**
- **Validation & Defaults:** Models enforce required fields and set intelligent defaults (e.g., `stock` defaults to 0).
- **Relational References:** The `Product` schema holds an `ObjectId` reference to the `Category` schema, allowing efficient cross-referencing via Mongoose `.populate()`.
- **Performance Indexing:** To guarantee microsecond-level query resolution on heavy-traffic endpoints, compound indexes are applied directly to the schemas.
  - Example (`product.model.js`): `productSchema.index({ mostPopular: 1, isActive: 1, isDeleted: 1 });`
- **Soft Deletes:** Records utilize an `isDeleted` boolean flag rather than hard database removal, preserving historical order data.

---

## 8. Error Handling

A centralized error handling mechanism ensures the API never leaks stack traces or unhandled promises in production.

- **CatchAsync Wrapper:** All asynchronous controllers are wrapped in a `catchAsync` utility function, completely eliminating boilerplate `try/catch` blocks and automatically forwarding rejections to the global error handler.
- **Global Error Middleware (`server.js`):**
  - Intercepts all operational errors.
  - Formats JWT expiration/validation errors into human-readable messages (`"Invalid or expired token. Please log in again."`).
  - In production (`NODE_ENV === 'production'`), generic 500 server errors are masked with `"Something went wrong on the server!"` to prevent exposing internal infrastructure details.

---

## 9. Performance & Backend Efficiency

**Implemented Optimizations:**
- **Database Indexes:** Applied to critical queries (like fetching active, popular products) to prevent O(N) collection scans.
- **Payload Compression:** `compression()` middleware compresses all JSON responses and static assets via Gzip/Brotli, reducing network transit time.
- **Image Optimization:** Server-side `WebP` conversion offloads heavy image processing from the client and drastically reduces asset sizes.
- **Static Asset Caching:** Long-lived `Cache-Control` headers (1 year) on the `/uploads` directory prevent clients from re-downloading static images.

**Not verified in the current codebase:**
- Redis-based API response caching.
- Database query sharding or horizontal scaling.

---

## 10. Key Engineering Decisions

| Decision | Why | Trade-off / Result |
| :--- | :--- | :--- |
| **NoSQL (MongoDB)** | The E-Commerce catalog requires flexible schemas (products have varying attributes). | Lacks rigid ACID transaction guarantees across multiple documents compared to Postgres. |
| **Stateless JWT** | Allows the API to scale horizontally without managing session memory. | Makes immediate token revocation difficult. |
| **Sharp Image Processing** | Frontend required ultra-fast LCP times and responsive images. | Increases CPU load on the Node.js server during the upload phase, but results in massive frontend performance gains. |
| **Centralized Error Handling** | Prevents repeated `try/catch` logic in every controller. | Highly maintainable, uniform API responses. |

---

## 11. Environment & Configuration

Environment variables (`.env`) are used strictly to manage configuration across environments, ensuring secrets are never hardcoded in the repository.

**Managed Configurations:**
- `PORT` (Server binding port)
- `MONGO_URI` (Database connection string)
- `SECRET_KEY` (Cryptographic key for signing JWTs)
- `NODE_ENV` (Toggles development vs. production error behaviors)

---

## 12. Deployment Readiness Checklist

| Feature | Status | Note |
| :--- | :--- | :--- |
| Environment Variables | ✅ Implemented | `dotenv` securely loads config. |
| CORS Configuration | ✅ Implemented | Managed via `cors.middleware.js`. |
| Security Headers | ✅ Implemented | Helmet restricts policies. |
| Rate Limiting | ✅ Implemented | Applied to Auth routes. |
| Database Connection | ✅ Implemented | Robust connection via Mongoose. |
| Image Storage | ⚠️ Needs Review | Currently uses local disk (`/uploads`). For scalable production, migrating to AWS S3 / Cloudinary is recommended. |

---

## 13. Portfolio-Quality Summary

This Node.js/Express backend demonstrates a mature understanding of RESTful API architecture, security engineering, and performance optimization. Rather than simply acting as a basic CRUD wrapper around a database, the system incorporates advanced features such as role-based access control, aggressive request throttling, and an automated, multi-variant image processing pipeline (utilizing Sharp and WebP).

The codebase exhibits high maintainability through strict separation of concerns (Controllers vs. Routes vs. Models) and centralized error management. The inclusion of database indexing and payload compression proves a strong focus on scalability and raw throughput, making this API fully capable of driving a modern, high-traffic E-Commerce frontend.
