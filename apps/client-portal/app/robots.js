export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: ['/login', '/register'],
      disallow: ['/portal', '/team', '/api/']
    }
  };
}
