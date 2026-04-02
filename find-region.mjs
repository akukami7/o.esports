import { PrismaClient } from '@prisma/client';

const regions = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1',
  'ap-northeast-1', 'ap-northeast-2', 'ap-southeast-1', 'ap-southeast-2',
  'ap-south-1', 'sa-east-1', 'ca-central-1'
];

const pass = 'Pw4MPZHQYlzgrqe0';
const project = 'dslnqvzeqwygfgctator';

async function main() {
  for (const region of regions) {
    const poolerUrl = `postgresql://postgres.${project}:${pass}@aws-0-${region}.pooler.supabase.com:6543/postgres?pgbouncer=true`;
    console.log(`[+] Проверяю регион ${region}...`);
    
    const prisma = new PrismaClient({
      datasourceUrl: poolerUrl,
    });
    
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log(`\n✅ БИНГО! Ваш регион: ${region}`);
      await prisma.$disconnect();
      process.exit(0);
    } catch (err) {
      if (err.message.includes('Tenant or user not found') || err.message.includes('Can\'t reach database server')) {
        // wrong region
      } else {
        console.log(`\n⚠️ Ошибка в ${region}: ${err.message}`);
      }
    }
    await prisma.$disconnect();
  }
  console.log(`\n❌ Регион не найден.`);
}

main();
