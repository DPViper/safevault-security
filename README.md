# SafeVault - Secure Vault Application

SafeVault is a secure web application for storing and managing sensitive information with robust security features including authentication, role-based access control (RBAC), input validation, and protection against common web vulnerabilities.

## Features

- **Authentication & Authorization**: Secure JWT-based authentication with role-based access control (admin/user roles)
- **Input Validation**: Server-side validation for all user inputs with type checking, length limits, and format validation
- **SQL Injection Prevention**: All database queries use parameterized queries to prevent SQL injection attacks
- **XSS Prevention**: Output escaping and sanitization to prevent cross-site scripting attacks
- **Secure Password Storage**: Passwords are hashed using bcrypt before storage
- **Protected Routes**: Middleware-based route protection with role-based permissions

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Testing**: Jest, Supertest
- **Frontend**: Vanilla HTML/CSS/JavaScript

## Project Structure

```
safevault/
├── src/
│   ├── database/
│   │   ├── db.js              # Database connection
│   │   └── setup.js           # Database schema setup
│   ├── middleware/
│   │   ├── auth.js            # Authentication & RBAC middleware
│   │   └── validation.js      # Input validation middleware
│   ├── routes/
│   │   ├── auth.js            # Authentication routes
│   │   ├── vault.js           # Vault item routes
│   │   └── users.js           # User management routes (admin)
│   ├── utils/
│   │   └── security.js        # Security utilities (XSS prevention)
│   └── server.js              # Express server setup
├── public/
│   ├── css/
│   │   └── style.css          # Application styles
│   ├── js/
│   │   └── app.js             # Frontend application logic
│   └── index.html             # Main HTML page
├── tests/
│   ├── auth.test.js           # Authentication tests
│   ├── rbac.test.js           # Role-based access control tests
│   ├── sqli.test.js           # SQL injection prevention tests
│   ├── xss.test.js            # XSS prevention tests
│   └── input-validation.test.js # Input validation tests
├── package.json
├── jest.config.js
└── README.md
```

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd safevault
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=safevault
DB_USER=postgres
DB_PASSWORD=postgres

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

PORT=3000
NODE_ENV=development

DEFAULT_ADMIN_EMAIL=admin@safevault.com
DEFAULT_ADMIN_PASSWORD=Admin123!
```

4. Create the PostgreSQL database:
```bash
createdb safevault
```

5. Set up the database schema:
```bash
npm run setup-db
```

This will create the necessary tables and a default admin user.

## How to Run

Start the development server:
```bash
npm start
```

Or with auto-reload (requires nodemon):
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## How to Run Tests

Run all tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm test -- --coverage
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Default Roles/Users

After running `npm run setup-db`, the following default users are created:

### Admin User
- **Email**: `admin@safevault.com` (or value from `DEFAULT_ADMIN_EMAIL`)
- **Password**: `Admin123!` (or value from `DEFAULT_ADMIN_PASSWORD`)
- **Role**: `admin`

### Test User
- **Email**: `user@test.com`
- **Password**: `User123!`
- **Role**: `user`

**Important**: Change these default credentials in production!

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user info

### Vault Items (Requires Authentication)
- `GET /api/vault` - Get user's own vault items
- `GET /api/vault/all` - Get all vault items (admin only)
- `GET /api/vault/:id` - Get a specific vault item
- `POST /api/vault` - Create a new vault item
- `POST /api/vault/search` - Search vault items
- `PUT /api/vault/:id` - Update a vault item
- `DELETE /api/vault/:id` - Delete a vault item

### User Management (Admin Only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get a specific user
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user

## Security Features

### Input Validation
- Type checking (string/int/bool)
- Length limits (max 255 chars for names, 5000 for notes)
- Format validation (email format, password strength)
- Allowed values (enums for roles)
- Rejection of unexpected fields

### SQL Injection Prevention
- All database queries use parameterized queries
- No string concatenation in SQL queries
- Example: `db.query('SELECT * FROM vault WHERE owner = $1', [userId])`

### XSS Prevention
- Output escaping for HTML entities
- Sanitization of user input before storage
- Removal of script tags and event handlers
- JavaScript protocol filtering

### Authentication & Authorization
- JWT-based authentication
- Secure password hashing with bcrypt (10 rounds)
- Role-based access control (RBAC)
- Protected routes with middleware
- Admin-only endpoints for user management

## Testing

The test suite includes:
- **Authentication tests**: Login, registration, protected routes
- **RBAC tests**: Role-based access control verification
- **SQL Injection tests**: Prevention of SQL injection attacks
- **XSS tests**: Prevention of cross-site scripting attacks
- **Input validation tests**: Type checking, length limits, format validation

See `SECURITY_NOTES.md` for detailed information about vulnerabilities found and fixed.

## License

MIT
