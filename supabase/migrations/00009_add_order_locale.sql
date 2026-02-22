-- Add locale column to orders table for multilingual email support
ALTER TABLE orders ADD COLUMN locale VARCHAR(10) NOT NULL DEFAULT 'ja';
