# Authentication API Documentation

## Overview

PermitAI uses JWT-based authentication with access and refresh tokens. All protected endpoints require a valid access token in the Authorization header.

## Authentication Flow

```mermaid
sequenceDiagram
    Client->>API: POST /auth/login
    API->>Database: Validate credentials
    API->>Client: Return access & refresh tokens
    Client->>API: GET /api/permits (with access token)
    API->>Client: Return permits data
    Client->>API: POST /auth/refresh (when access expires)
    API->>Client: Return new access & refresh tokens
```

## Endpoints

### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "555-1234",
  "organizationId": "optional-org-id"
}

Response: 201 Created
{
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": {
      "id": "clxxx...",
      "name": "applicant",
      "permissions": ["permits.create", "permits.read.own", ...]
    }
  },
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response: 200 OK
{
  "user": {
    "id": "clxxx...",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": {
      "id": "clxxx...",
      "name": "reviewer",
      "permissions": ["permits.read", "permits.update", ...]
    },
    "department": {
      "id": "clxxx...",
      "name": "Building Department"
    }
  },
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

Response: 200 OK
{
  "user": { ... },
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "id": "clxxx...",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "555-1234",
  "title": "Senior Reviewer",
  "emailVerified": true,
  "lastLogin": "2024-01-20T10:30:00Z",
  "preferences": { ... },
  "role": {
    "id": "clxxx...",
    "name": "reviewer",
    "description": "Permit Reviewer",
    "permissions": ["permits.read", "permits.update", ...]
  },
  "department": {
    "id": "clxxx...",
    "name": "Building Department",
    "code": "BUILD"
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-20T10:30:00Z"
}
```

### Logout
```http
POST /api/auth/logout
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "message": "Logged out successfully"
}
```

### Logout All Devices
```http
POST /api/auth/logout-all
Authorization: Bearer {accessToken}

Response: 200 OK
{
  "message": "Logged out from all devices"
}
```

## Using Protected Endpoints

All protected endpoints require the access token in the Authorization header:

```http
GET /api/permits
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Token Details

### Access Token
- **Expiry**: 15 minutes
- **Usage**: API requests
- **Storage**: Memory or sessionStorage

### Refresh Token
- **Expiry**: 7 days
- **Usage**: Get new access token
- **Storage**: Secure httpOnly cookie or localStorage

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Invalid credentials"
}
```

### 401 Token Expired
```json
{
  "error": "Token expired",
  "code": "TOKEN_EXPIRED"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions",
  "required": ["permits.update"]
}
```

### 409 Conflict
```json
{
  "error": "User already exists"
}
```

## Security Best Practices

1. **Never store passwords** - Always hash with bcrypt
2. **Use HTTPS** - Tokens can be intercepted over HTTP
3. **Short access token expiry** - Limits exposure if compromised
4. **Secure token storage** - Use httpOnly cookies when possible
5. **Implement rate limiting** - Prevent brute force attacks
6. **Session management** - Allow users to see/revoke sessions

## Permission System

Permissions follow the format: `resource.action[.scope]`

Examples:
- `permits.read` - Read all permits
- `permits.read.own` - Read own permits only
- `permits.create` - Create new permits
- `permits.update` - Update any permit
- `permits.delete` - Delete permits
- `*` - Admin access to everything

## Test Credentials

After running seed script:
- **Admin**: admin@permitai.gov / password123
- **Reviewer**: reviewer@permitai.gov / password123
- **Inspector**: inspector@permitai.gov / password123
- **Applicant**: applicant@example.com / password123