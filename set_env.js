const { execSync } = require('child_process');

const vars = {
  DATABASE_URL: "postgresql://postgres:Pw4MPZHQYlzgrqe0@db.dslnqvzeqwygfgctator.supabase.co:5432/postgres",
  PUSHER_APP_ID: "2136286",
  NEXT_PUBLIC_PUSHER_KEY: "36177b17db08b045241f",
  PUSHER_SECRET: "157b565e6053b18537fc",
  NEXT_PUBLIC_PUSHER_CLUSTER: "eu",
  NEXT_PUBLIC_SITE_URL: "https://o-esports-akukami7-focus-projects-c0bdfce0.vercel.app"
};

for (const [key, value] of Object.entries(vars)) {
  console.log(`Setting ${key}...`);
  try { 
    // try to remove existing first (silently)
    execSync(`vercel env rm ${key} production -y`, { stdio: 'ignore' }); 
  } catch (e) {}
  
  // Add new via stdin to avoid newlines
  execSync(`vercel env add ${key} production`, {
    input: value,
    stdio: ['pipe', 'inherit', 'inherit']
  });
}
console.log("Done!");
