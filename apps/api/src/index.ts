import app from './app';

const PORT = process.env.PORT || 3000;

console.log(`
╔══════════════════════════════════════════════════════════════╗
║  ░▒▓ CODEGRAVITY AI - API SERVER ▓▒░                        ║
╠══════════════════════════════════════════════════════════════╣
║  🚀 Server starting...                                       ║
║  📡 Port: ${PORT}                                              ║
║  🌍 Environment: ${process.env.NODE_ENV || 'development'}                            ║
╚══════════════════════════════════════════════════════════════╝
`);

export default {
  port: PORT,
  fetch: app.fetch,
};
