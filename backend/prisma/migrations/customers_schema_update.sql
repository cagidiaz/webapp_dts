-- Migration: Update 'customers' table schema
-- 1. Rename 'country' to 'county'
-- 2. Drop legacy timestamp columns 'last_date_modified' and 'customer_since'

ALTER TABLE public.customers RENAME COLUMN country TO county;
ALTER TABLE public.customers DROP COLUMN last_date_modified;
ALTER TABLE public.customers DROP COLUMN customer_since;
