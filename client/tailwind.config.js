export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        surface: { DEFAULT: '#0f172a', 1: '#1e293b', 2: '#334155' }
      }
    }
  },
  plugins: []
};
