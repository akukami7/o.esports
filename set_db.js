const { execSync } = require('child_process');
const url = "postgresql://postgres.dslnqvzeqwygfgctator:Pw4MPZHQYlzgrqe0@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"; // Added ?pgbouncer=true for Prisma

try { 
  execSync('vercel env rm DATABASE_URL production -y', { stdio: 'ignore' }); 
} catch(e) {}

execSync('vercel env add DATABASE_URL production', { 
  input: url, 
  stdio: ['pipe', 'inherit', 'inherit'] 
});
console.log("Database URL successfully updated!");
