import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any) as any;
const prisma = new PrismaClient({ adapter });

async function test() {
  try {
    console.log('Testing connection to:', process.env.DATABASE_URL);
    const roles = await prisma.role.findMany();
    console.log('Successfully fetched roles:', roles.length);
    console.log('Roles:', JSON.stringify(roles, null, 2));
    
    const profiles = await prisma.profile.findMany();
    console.log('Successfully fetched profiles:', profiles.length);
  } catch (err: any) {
    console.error('DATABASE CONNECTION ERROR:', err.message);
    if (err.stack) console.error(err.stack);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
