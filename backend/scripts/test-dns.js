import dns from 'node:dns/promises';

const server = process.argv[2] ?? '127.0.0.1';
const domain = process.argv[3] ?? 'example.com';
const port = Number(process.argv[4] ?? 53);

dns.setServers([`${server}:${port}`]);

try {
  const addresses = await dns.resolve4(domain);
  console.log(`${domain} -> ${addresses.join(', ')}`);
} catch (error) {
  console.error(`DNS test failed: ${error.message}`);
  process.exit(1);
}

