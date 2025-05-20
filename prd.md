import { defineConfig } from 'taskmaster-ai';

export default defineConfig({
  project: {
    name: 'Popmint',
    description: 'A Next.js application for image manipulation and canvas interactions',
  },
  ai: {
    provider: 'openai', // or 'anthropic' if you prefer
    model: 'gpt-4-turbo-preview', // or your preferred model
  },
  tasks: {
    baseDir: './tasks',
    autoload: true,
  },
  storage: {
    type: 'local',
    directory: '.taskmaster',
  },
  logging: {
    level: 'info',
    format: 'pretty',
  },
});
