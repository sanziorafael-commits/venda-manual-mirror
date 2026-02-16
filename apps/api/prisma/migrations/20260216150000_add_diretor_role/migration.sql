-- Add new company-level role with broad visibility scope.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DIRETOR';
