// Set mock env vars before any tests run
process.env.WORKER_SECRET = 'test-worker-secret-abc123';
process.env.SOKETI_APP_ID = 'mock-app-id';
process.env.NEXT_PUBLIC_SOKETI_KEY = 'mock-key';
process.env.SOKETI_SECRET = 'mock-secret';
process.env.SOKETI_HOST = 'mock.soketi.local';
process.env.SOKETI_PORT = '443';
