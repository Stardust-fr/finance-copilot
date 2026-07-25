import 'dotenv/config';

// Ensure test environment is set
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_vitest';
process.env.JWT_EXPIRES_IN = '1h';
