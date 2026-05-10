/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#534AB7',
        'primary-light': '#7F77DD',
        'primary-dark': '#3C3489',
        'primary-surface': '#EEEDFE',
        accent: '#378ADD',
        'accent-dark': '#185FA5',
        'accent-surface': '#E6F1FB',
      },
    },
  },
  plugins: [],
}
