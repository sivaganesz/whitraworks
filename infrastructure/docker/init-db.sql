-- Create test database if it does not already exist
SELECT 'CREATE DATABASE whitraworks_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'whitraworks_test')\gexec

